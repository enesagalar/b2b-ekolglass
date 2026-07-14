"use server";

import { revalidatePath } from "next/cache";

import { getStatusLabel } from "@/domain/statuses";
import { dealerApplicationReviewSchema } from "@/domain/validation";
import { Prisma } from "@/generated/prisma/client";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type DealerApplicationAdminState = {
  ok: boolean;
  message: string;
  companyId?: string;
  userId?: string;
};

type DealerApplicationAdminInput = FormData | DealerApplicationAdminState;

class DealerApplicationReviewError extends Error {}

const success = (
  message: string,
  data?: Pick<DealerApplicationAdminState, "companyId" | "userId">,
): DealerApplicationAdminState => ({ ok: true, message, ...data });

const failure = (message: string): DealerApplicationAdminState => ({ ok: false, message });

function resolveFormData(input: DealerApplicationAdminInput, maybeFormData?: FormData) {
  return input instanceof FormData ? input : maybeFormData;
}

function getReviewInput(formData: FormData) {
  return {
    id: formData.get("id"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    status: formData.get("status"),
    internalNotes: formData.get("internalNotes") || undefined,
    customerGroupId: formData.get("customerGroupId") || undefined,
    paymentTerms: formData.get("paymentTerms") || undefined,
    creditLimit: formData.get("creditLimit") || undefined,
  };
}

const allowedStatusTransitions: Record<string, string[]> = {
  NEW: ["NEW", "IN_REVIEW", "NEEDS_INFO", "APPROVED", "REJECTED"],
  IN_REVIEW: ["IN_REVIEW", "NEEDS_INFO", "APPROVED", "REJECTED"],
  NEEDS_INFO: ["NEEDS_INFO", "IN_REVIEW", "APPROVED", "REJECTED"],
  REJECTED: ["REJECTED", "IN_REVIEW"],
  APPROVED: ["APPROVED"],
};

function mapMutationError(error: unknown) {
  if (error instanceof DealerApplicationReviewError) {
    return error.message;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Bu e-posta ile daha önce kullanıcı oluşturulmuş. Kullanıcı ve firma eşleşmesini kontrol edin.";
    }

    if (error.code === "P2003") {
      return "Seçilen müşteri grubu veya ilişkili kayıt bulunamadı.";
    }
  }

  return "Başvuru güncellenirken beklenmeyen bir hata oluştu.";
}

export async function reviewDealerApplication(
  input: DealerApplicationAdminInput,
  maybeFormData?: FormData,
): Promise<DealerApplicationAdminState> {
  const user = await requirePermissionUser("dealer.application.review", `/admin/bayi-basvurulari`);
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }

  const parsed = dealerApplicationReviewSchema.safeParse(getReviewInput(formData));

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Başvuru bilgileri geçersiz.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.dealerApplication.findUnique({
        where: { id: parsed.data.id },
      });

      if (!application) {
        throw new DealerApplicationReviewError("Başvuru bulunamadı.");
      }

      if (application.updatedAt.toISOString() !== new Date(parsed.data.expectedUpdatedAt).toISOString()) {
        throw new DealerApplicationReviewError(
          "Başvuru başka bir kullanıcı tarafından güncellendi. Güncel veriyi görmek için sayfayı yenileyin.",
        );
      }

      if (!allowedStatusTransitions[application.status]?.includes(parsed.data.status)) {
        throw new DealerApplicationReviewError(
          `${getStatusLabel(application.status)} durumundan ${getStatusLabel(parsed.data.status)} durumuna doğrudan geçilemez.`,
        );
      }

      let companyId = application.companyId ?? undefined;
      let provisionedUserId: string | undefined;

      if (parsed.data.status === "APPROVED") {
        const customerGroup = await tx.customerGroup.findUnique({
          where: { id: parsed.data.customerGroupId! },
          select: { id: true },
        });

        if (!customerGroup) {
          throw new DealerApplicationReviewError("Seçilen müşteri grubu bulunamadı.");
        }

        const normalizedEmail = application.email.trim().toLowerCase();
        const existingUser = await tx.user.findUnique({ where: { email: normalizedEmail } });

        if (existingUser && (!companyId || existingUser.companyId !== companyId)) {
          throw new DealerApplicationReviewError(
            "Başvuru e-postası başka bir kullanıcı hesabında kayıtlı. Otomatik firma bağlantısı güvenlik nedeniyle durduruldu.",
          );
        }

        if (existingUser && existingUser.role !== "DEALER_OWNER") {
          throw new DealerApplicationReviewError(
            "Mevcut kullanıcı hesabının rolü bayi sahibi değil. Otomatik rol yükseltmesi güvenlik nedeniyle durduruldu.",
          );
        }

        if (companyId) {
          await tx.company.update({
            where: { id: companyId },
            data: {
              legalName: application.companyName,
              displayName: application.companyName,
              taxNumber: application.taxNumber,
              email: normalizedEmail,
              phone: application.phone,
              city: application.city,
              status: "APPROVED",
              customerGroupId: customerGroup.id,
              paymentTerms: parsed.data.paymentTerms ?? null,
              creditLimit: parsed.data.creditLimit ?? null,
              creditPolicy:
                parsed.data.creditLimit === undefined ? "UNSET" : "LIMITED",
              internalNotes: parsed.data.internalNotes ?? null,
            },
          });
        } else {
          const companyConflict = await tx.company.findFirst({
            where: {
              OR: [
                { email: normalizedEmail },
                ...(application.taxNumber ? [{ taxNumber: application.taxNumber.trim() }] : []),
              ],
            },
            select: { id: true },
          });

          if (companyConflict) {
            throw new DealerApplicationReviewError(
              "Bu e-posta veya vergi numarasıyla kayıtlı bir firma var. Otomatik mükerrer firma oluşturma durduruldu.",
            );
          }

          const company = await tx.company.create({
            data: {
              id: `dealer-company-${application.id}`,
              legalName: application.companyName,
              displayName: application.companyName,
              taxNumber: application.taxNumber,
              email: normalizedEmail,
              phone: application.phone,
              city: application.city,
              status: "APPROVED",
              customerGroupId: customerGroup.id,
              paymentTerms: parsed.data.paymentTerms,
              creditLimit: parsed.data.creditLimit,
              creditPolicy:
                parsed.data.creditLimit === undefined ? "UNSET" : "LIMITED",
              internalNotes: parsed.data.internalNotes,
            },
          });

          companyId = company.id;
        }

        if (existingUser) {
          const updatedUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: application.contactName,
            },
          });
          provisionedUserId = updatedUser.id;
        } else {
          const dealerUser = await tx.user.create({
            data: {
              id: `dealer-owner-${application.id}`,
              email: normalizedEmail,
              name: application.contactName,
              role: "DEALER_OWNER",
              status: "INVITED",
              companyId,
              passwordHash: null,
            },
          });
          provisionedUserId = dealerUser.id;
        }
      }

      const updatedApplication = await tx.dealerApplication.update({
        where: { id: application.id },
        data: {
          status: parsed.data.status,
          companyId,
          reviewedById: user.id,
          reviewedAt: new Date(),
          internalNotes: parsed.data.internalNotes ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: parsed.data.status === "APPROVED" ? "dealer_application.approve" : "dealer_application.review",
          entityType: "DealerApplication",
          entityId: application.id,
          metadata: JSON.stringify({
            fromStatus: application.status,
            toStatus: updatedApplication.status,
            companyId,
            provisionedUserId,
            customerGroupId: parsed.data.customerGroupId,
          }),
        },
      });

      return { companyId, provisionedUserId };
    });

    revalidatePath("/admin");
    revalidatePath("/admin/bayi-basvurulari");
    revalidatePath(`/admin/bayi-basvurulari/${parsed.data.id}`);

    if (parsed.data.status === "APPROVED") {
      return success("Başvuru onaylandı; firma ve davet bekleyen bayi sahibi hesabı hazırlandı.", {
        companyId: result.companyId,
        userId: result.provisionedUserId,
      });
    }

    return success("Başvuru durumu ve inceleme notları güncellendi.");
  } catch (error) {
    return failure(mapMutationError(error));
  }
}

export async function reviewDealerApplicationForm(
  previousState: DealerApplicationAdminState,
  formData: FormData,
) {
  return reviewDealerApplication(previousState, formData);
}
