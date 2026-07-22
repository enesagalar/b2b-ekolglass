"use server";

import { revalidatePath } from "next/cache";

import { siteSettingSchema } from "@/domain/validation";
import { requirePermissionUser } from "@/lib/auth";
import { getCorrelationId, structuredLog } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

export type SiteSettingActionState = {
  ok: boolean;
  message: string;
  correlationId?: string;
};

class SiteSettingMutationError extends Error {}

export async function updateSiteSetting(
  _previousState: SiteSettingActionState,
  formData: FormData,
): Promise<SiteSettingActionState> {
  const user = await requirePermissionUser("admin.content.manage", "/admin/icerik");
  const parsed = siteSettingSchema.safeParse({
    key: formData.get("key"),
    value: formData.get("value"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "CMS bilgileri geçersiz." };
  }

  const correlationId = getCorrelationId();
  try {
    const changed = await prisma.$transaction(async (tx) => {
      const setting = await tx.siteSetting.findUnique({ where: { key: parsed.data.key } });
      if (
        !setting ||
        !setting.isEditable ||
        setting.group !== "homepage" ||
        setting.valueType !== "TEXT"
      ) {
        throw new SiteSettingMutationError("Bu içerik alanı düzenlenemez.");
      }

      const expectedUpdatedAt = new Date(parsed.data.expectedUpdatedAt);
      if (setting.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new SiteSettingMutationError("Bu içerik başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
      }
      if (setting.value === parsed.data.value) return false;

      const updated = await tx.siteSetting.updateMany({
        where: {
          id: setting.id,
          key: parsed.data.key,
          group: "homepage",
          valueType: "TEXT",
          isEditable: true,
          updatedAt: expectedUpdatedAt,
        },
        data: { value: parsed.data.value },
      });
      if (updated.count !== 1) {
        throw new SiteSettingMutationError("Bu içerik başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "site_setting.update",
          entityType: "SiteSetting",
          entityId: setting.id,
          metadata: JSON.stringify({
            key: setting.key,
            previousValue: setting.value,
            value: parsed.data.value,
            expectedUpdatedAt: parsed.data.expectedUpdatedAt,
            correlationId,
          }),
        },
      });
      return true;
    });

    if (!changed) return { ok: true, message: "Değişiklik bulunamadı." };
    revalidatePath("/");
    revalidatePath("/admin/icerik");
    return { ok: true, message: "İçerik alanı kaydedildi." };
  } catch (error) {
    if (error instanceof SiteSettingMutationError) {
      return { ok: false, message: error.message };
    }
    structuredLog("error", "cms.site_setting.update_failed", { correlationId, error });
    return {
      ok: false,
      message: `İçerik ayarı kaydedilemedi. Destek kodu: ${correlationId}`,
      correlationId,
    };
  }
}
