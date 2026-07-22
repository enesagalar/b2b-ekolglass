import { z } from "zod";

import { hasPermission, isKnownRole } from "@/domain/roles";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePathsBestEffort } from "@/lib/cache-revalidation";
import {
  deleteStoredImage,
  detectImageMime,
  maxImageUploadBytes,
  storeImage,
} from "@/lib/media-storage";
import { correlationHeaders, getCorrelationId, structuredLog } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const inputSchema = z.object({
  altText: z.string().trim().min(5).max(180),
  expectedUpdatedAt: z.string().trim().refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Banner sürümü geçersiz.",
  ),
});

class HeroMediaConflictError extends Error {}

export async function POST(request: Request) {
  const correlationId = getCorrelationId();
  const json = (body: object, status = 200) => Response.json(body, {
    status,
    headers: correlationHeaders(correlationId),
  });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return json({ message: "Geçersiz istek kaynağı." }, 403);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(declaredLength) || declaredLength > maxImageUploadBytes + 512_000) {
    return json({ message: "Dosya boyutu sınırı aşıldı." }, 413);
  }

  let stored: Awaited<ReturnType<typeof storeImage>> | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) return json({ message: "Oturum gerekli." }, 401);
    if (!isKnownRole(user.role) || !hasPermission(user.role, "admin.content.manage")) {
      return json({ message: "Bu işlem için yetkiniz yok." }, 403);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const parsed = inputSchema.safeParse({
      altText: formData.get("altText"),
      expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    });
    if (!(file instanceof File) || !parsed.success) {
      return json({ message: parsed.success ? "Görsel dosyası zorunludur." : parsed.error.issues[0]?.message }, 400);
    }
    if (!file.size || file.size > maxImageUploadBytes) {
      return json({ message: "Görsel 5 MB sınırını aşamaz." }, 413);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!detectImageMime(buffer)) {
      return json({ message: "Yalnız JPEG, PNG veya WebP görsel yüklenebilir." }, 415);
    }
    stored = await storeImage(buffer);

    const previous = await prisma.$transaction(async (tx) => {
      const current = await tx.mediaAsset.findUnique({ where: { key: "homepage.hero.visual" } });
      if (!current) throw new HeroMediaConflictError("Banner kaydı bulunamadı.");
      const expectedUpdatedAt = new Date(parsed.data.expectedUpdatedAt);
      if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new HeroMediaConflictError("Banner başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
      }

      const updated = await tx.mediaAsset.updateMany({
        where: { id: current.id, key: "homepage.hero.visual", updatedAt: expectedUpdatedAt },
        data: {
          title: "EkolGlass ana sayfa banner görseli",
          altText: parsed.data.altText,
          usage: "HOMEPAGE_HERO",
          isActive: true,
          uploadedByUserId: user.id,
          ...stored!,
        },
      });
      if (updated.count !== 1) {
        throw new HeroMediaConflictError("Banner başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "homepage.hero.media.upload",
          entityType: "MediaAsset",
          entityId: current.id,
          metadata: JSON.stringify({
            correlationId,
            previousObjectKey: current.objectKey,
            objectKey: stored!.objectKey,
            mimeType: stored!.mimeType,
            byteSize: stored!.byteSize,
            checksum: stored!.checksum,
            storageProvider: stored!.storageProvider,
          }),
        },
      });
      return current;
    });

    revalidatePathsBestEffort(
      ["/", "/admin/icerik"],
      "cms.hero_cache_revalidation_failed",
      { correlationId, mediaAssetId: previous.id },
    );
    return json({ ok: true, url: stored.url });
  } catch (error) {
    if (stored) {
      try {
        await deleteStoredImage(stored.objectKey, stored.storageProvider);
      } catch (compensationError) {
        structuredLog("error", "cms.hero_upload.compensation_failed", {
          correlationId,
          objectKey: stored.objectKey,
          compensationError,
        });
      }
    }
    if (error instanceof HeroMediaConflictError) {
      return json({ message: error.message }, 409);
    }
    structuredLog("error", "cms.hero_upload.failed", { correlationId, error });
    return json({ message: "Görsel yüklenemedi.", correlationId }, 500);
  }
}
