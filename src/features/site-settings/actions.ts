"use server";

import { revalidatePath } from "next/cache";

import { homepageHeroMediaSchema, siteSettingSchema } from "@/domain/validation";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateSiteSetting(formData: FormData) {
  const user = await requireAdminUser();
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

export async function updateHomepageHeroMedia(formData: FormData) {
  const user = await requireAdminUser();
  const parsed = homepageHeroMediaSchema.safeParse({ url: formData.get("url"), altText: formData.get("altText") });
  if (!parsed.success) return;

  await prisma.mediaAsset.upsert({
    where: { key: "homepage.hero.visual" },
    update: { ...parsed.data, title: "EkolGlass ana sayfa banner görseli", usage: "HOMEPAGE_HERO", isActive: true },
    create: { key: "homepage.hero.visual", title: "EkolGlass ana sayfa banner görseli", usage: "HOMEPAGE_HERO", isActive: true, ...parsed.data },
  });
  await prisma.auditLog.create({ data: { actorUserId: user.id, action: "homepage.hero.media.update", entityType: "MediaAsset", entityId: "homepage.hero.visual" } });
  revalidatePath("/");
  revalidatePath("/admin/icerik");
}
