"use server";

import { revalidatePath } from "next/cache";

import { siteSettingSchema } from "@/domain/validation";
import { prisma } from "@/lib/prisma";

export async function updateSiteSetting(formData: FormData) {
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

  revalidatePath("/");
  revalidatePath("/admin/icerik");
}
