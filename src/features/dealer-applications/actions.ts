"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { dealerApplicationSchema } from "@/domain/validation";
import {
  claimDealerApplicationDeduplication,
  completeDealerApplicationDeduplication,
  consumeSecurityRateLimit,
  createSecurityRateLimitContext,
} from "@/features/auth/security-rate-limit";
import { prisma } from "@/lib/prisma";
import { requiresTrustedClientIp, resolveTrustedClientIp } from "@/lib/request-security";

export type DealerApplicationState = {
  ok: boolean;
  message: string;
  reference?: string;
};

const successMessage =
  "Başvurunuz alındı. EkolGlass satış ekibi inceleme sonrası sizinle iletişime geçecek.";

function referenceFor(applicationId: string) {
  return `BAS-${applicationId.slice(-8).toUpperCase()}`;
}

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
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Başvuru bilgileri eksik." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const requestHeaders = await headers();
  const ipAddress = resolveTrustedClientIp(requestHeaders);
  if (requiresTrustedClientIp() && !ipAddress) {
    return { ok: false, message: "İstek güvenlik doğrulamasından geçemedi. Lütfen daha sonra tekrar deneyin." };
  }
  const context = createSecurityRateLimitContext("DEALER_APPLICATION", email, ipAddress);
  const rateLimit = await consumeSecurityRateLimit(context);
  if (rateLimit.limited) {
    return { ok: false, message: "Çok fazla başvuru denemesi yapıldı. Lütfen daha sonra tekrar deneyin." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const claim = await claimDealerApplicationDeduplication(tx, context.subjectKey);
      if (!claim.claimed) {
        if (!claim.applicationId) throw new Error("DEALER_APPLICATION_CLAIM_INCOMPLETE");
        return { id: claim.applicationId, created: false };
      }

      const application = await tx.dealerApplication.create({
        data: {
          ...parsed.data,
          email,
          taxNumber: parsed.data.taxNumber?.trim() || undefined,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          action: "dealer.application.created",
          entityType: "DealerApplication",
          entityId: application.id,
          metadata: JSON.stringify({ customerType: parsed.data.customerType }),
        },
      });
      await completeDealerApplicationDeduplication(tx, {
        emailKey: context.subjectKey,
        claimToken: claim.claimToken,
        applicationId: application.id,
      });
      return { id: application.id, created: true };
    });

    if (result.created) revalidatePath("/admin/bayi-basvurulari");
    return { ok: true, message: successMessage, reference: referenceFor(result.id) };
  } catch {
    return { ok: false, message: "Başvuru şu anda kaydedilemedi. Lütfen daha sonra tekrar deneyin." };
  }
}
