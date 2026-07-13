"use server";

import { revalidatePath } from "next/cache";

import { siteSettingSchema } from "@/domain/validation";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateSiteSetting(formData: FormData) {
  const user = await requirePermissionUser("admin.content.manage", "/admin/icerik");
  const parsed = siteSettingSchema.safeParse({
    key: formData.get("key"),
    value: formData.get("value"),
  });

  if (!parsed.success) {
    return;
  }

  await prisma.siteSetting.upsert({
    where: { key: parsed.data.key },
    update: { value: parsed.data.value },
    create: {
      key: parsed.data.key,
      label: parsed.data.key,
      value: parsed.data.value,
      valueType: "TEXT",
      group: "homepage",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "site_setting.update",
      entityType: "SiteSetting",
      entityId: parsed.data.key,
      metadata: JSON.stringify({ key: parsed.data.key }),
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/icerik");
}
