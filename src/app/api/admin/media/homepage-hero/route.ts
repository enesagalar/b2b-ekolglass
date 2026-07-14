import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hasPermission, isKnownRole } from "@/domain/roles";
import { getCurrentUser } from "@/lib/auth";
import { maxImageUploadBytes, storeImage } from "@/lib/media-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const altTextSchema = z.string().trim().min(5).max(180);

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ message: "Gecersiz istek kaynagi." }, { status: 403 });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxImageUploadBytes + 512_000) return Response.json({ message: "Dosya boyutu siniri asildi." }, { status: 413 });

  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Oturum gerekli." }, { status: 401 });
  if (!isKnownRole(user.role) || !hasPermission(user.role, "admin.content.manage")) {
    return Response.json({ message: "Bu islem icin yetkiniz yok." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const altText = altTextSchema.safeParse(formData.get("altText"));
  if (!(file instanceof File) || !altText.success) {
    return Response.json({ message: "Gorsel ve aciklayici alternatif metin zorunludur." }, { status: 400 });
  }
  if (!file.size || file.size > maxImageUploadBytes) return Response.json({ message: "Gorsel 5 MB sinirini asamaz." }, { status: 413 });

  try {
    const stored = await storeImage(Buffer.from(await file.arrayBuffer()));
    const media = await prisma.mediaAsset.upsert({
      where: { key: "homepage.hero.visual" },
      update: {
        title: "EkolGlass ana sayfa banner gorseli",
        altText: altText.data,
        usage: "HOMEPAGE_HERO",
        isActive: true,
        uploadedByUserId: user.id,
        ...stored,
      },
      create: {
        key: "homepage.hero.visual",
        title: "EkolGlass ana sayfa banner gorseli",
        altText: altText.data,
        usage: "HOMEPAGE_HERO",
        isActive: true,
        uploadedByUserId: user.id,
        ...stored,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "homepage.hero.media.upload",
        entityType: "MediaAsset",
        entityId: media.id,
        metadata: JSON.stringify({ objectKey: stored.objectKey, mimeType: stored.mimeType, byteSize: stored.byteSize, checksum: stored.checksum }),
      },
    });
    revalidatePath("/");
    revalidatePath("/admin/icerik");
    return Response.json({ ok: true, url: stored.url });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Gorsel yuklenemedi." }, { status: 400 });
  }
}
