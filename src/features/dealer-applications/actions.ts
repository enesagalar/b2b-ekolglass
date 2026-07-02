"use server";

import { revalidatePath } from "next/cache";

import { dealerApplicationSchema } from "@/domain/validation";
import { prisma } from "@/lib/prisma";

export type DealerApplicationState = {
  ok: boolean;
  message: string;
};

export async function createDealerApplication(
  _previousState: DealerApplicationState,
  formData: FormData,
): Promise<DealerApplicationState> {
  const parsed = dealerApplicationSchema.safeParse({
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    taxNumber: formData.get("taxNumber") || undefined,
    customerType: formData.get("customerType"),
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Başvuru bilgileri eksik.",
    };
  }

  await prisma.dealerApplication.create({
    data: parsed.data,
  });

  revalidatePath("/admin/bayi-basvurulari");

  return {
    ok: true,
    message: "Başvurunuz alındı. EkolGlass satış ekibi inceleme sonrası sizinle iletişime geçecek.",
  };
}
