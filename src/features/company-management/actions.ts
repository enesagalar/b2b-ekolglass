"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  activationInvitationSchema,
  companyDiscountSchema,
  companyStatusSchema,
  credentialResetInvitationSchema,
  dealerUserCreateSchema,
  dealerUserStatusSchema,
} from "@/domain/validation";
import { getEmailConfig } from "@/integrations/email/config";
import { deriveActivationToken, getActivationExpiry, hashActivationToken } from "@/lib/activation-token";
import { requirePermissionUser } from "@/lib/auth";
import { enqueueIntegrationEvent } from "@/integrations/outbox";
import { getCorrelationId, structuredLog } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { derivePasswordResetToken, getPasswordResetExpiry, hashPasswordResetToken } from "@/lib/password-reset-token";

export type ActivationInvitationState = {
  ok: boolean;
  message: string;
  activationPath?: string;
  expiresAt?: string;
};

export type CompanyUserActionState = {
  ok: boolean;
  message: string;
  resetPath?: string;
  expiresAt?: string;
};

export type CompanyLifecycleActionState = {
  ok: boolean;
  message: string;
};

type ActivationInvitationInput = FormData | ActivationInvitationState;

const failure = (message: string): ActivationInvitationState => ({ ok: false, message });

class CompanyLifecycleError extends Error {}
class CompanyCommercialTermsError extends Error {}

export async function changeCompanyStatus(
  _previousState: CompanyLifecycleActionState,
  formData: FormData,
): Promise<CompanyLifecycleActionState> {
  const actor = await requirePermissionUser("company.lifecycle.manage", "/admin/firmalar");
  const parsed = companyStatusSchema.safeParse({
    companyId: formData.get("companyId"),
    expectedStatus: formData.get("expectedStatus"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    targetStatus: formData.get("targetStatus"),
    changeReason: formData.get("changeReason"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Firma durum bilgisi geçersiz." };
  }

  const allowed =
    (parsed.data.expectedStatus === "APPROVED" && parsed.data.targetStatus === "SUSPENDED") ||
    (parsed.data.expectedStatus === "SUSPENDED" && parsed.data.targetStatus === "APPROVED");
  if (!allowed) return { ok: false, message: "Bu firma durum geçişine izin verilmiyor." };

  try {
    await prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({
        where: { id: parsed.data.companyId },
        select: {
          status: true,
          updatedAt: true,
          users: {
            where: { role: { in: ["DEALER_OWNER", "DEALER_STAFF"] } },
            select: { id: true },
          },
        },
      });
      if (!company) throw new CompanyLifecycleError("Firma bulunamadı.");
      const expectedUpdatedAt = new Date(parsed.data.expectedUpdatedAt);
      if (
        company.status !== parsed.data.expectedStatus ||
        company.updatedAt.getTime() !== expectedUpdatedAt.getTime()
      ) {
        throw new CompanyLifecycleError("Firma durumu başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
      }

      const updated = await tx.company.updateMany({
        where: {
          id: parsed.data.companyId,
          status: parsed.data.expectedStatus,
          updatedAt: expectedUpdatedAt,
        },
        data: { status: parsed.data.targetStatus },
      });
      if (updated.count !== 1) {
        throw new CompanyLifecycleError("Firma durumu başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
      }

      const userIds = company.users.map((user) => user.id);
      let revokedSessions = 0;
      let revokedActivationTokens = 0;
      let revokedPasswordResetTokens = 0;
      if (parsed.data.targetStatus === "SUSPENDED" && userIds.length > 0) {
        const now = new Date();
        const [sessions, activationTokens, passwordResetTokens] = await Promise.all([
          tx.authSession.deleteMany({ where: { userId: { in: userIds } } }),
          tx.userActivationToken.updateMany({
            where: { userId: { in: userIds }, consumedAt: null, revokedAt: null },
            data: { revokedAt: now },
          }),
          tx.userPasswordResetToken.updateMany({
            where: { userId: { in: userIds }, consumedAt: null, revokedAt: null },
            data: { revokedAt: now },
          }),
        ]);
        revokedSessions = sessions.count;
        revokedActivationTokens = activationTokens.count;
        revokedPasswordResetTokens = passwordResetTokens.count;
      }

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: parsed.data.targetStatus === "SUSPENDED" ? "company.suspended" : "company.reactivated",
          entityType: "Company",
          entityId: parsed.data.companyId,
          metadata: JSON.stringify({
            fromStatus: parsed.data.expectedStatus,
            toStatus: parsed.data.targetStatus,
            reason: parsed.data.changeReason,
            dealerUserCount: userIds.length,
            revokedSessions,
            revokedActivationTokens,
            revokedPasswordResetTokens,
          }),
        },
      });
    });

    revalidatePath(`/admin/firmalar/${parsed.data.companyId}`);
    revalidatePath("/admin/firmalar");
    revalidatePath("/admin");
    return {
      ok: true,
      message: parsed.data.targetStatus === "SUSPENDED"
        ? "Firma erişimi askıya alındı ve açık oturumlar kapatıldı."
        : "Firma yeniden etkinleştirildi.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof CompanyLifecycleError
        ? error.message
        : "Firma durumu güncellenemedi.",
    };
  }
}

export async function updateCompanyDiscount(
  _previousState: CompanyUserActionState,
  formData: FormData,
): Promise<CompanyUserActionState> {
  const actor = await requirePermissionUser("company.manage", "/admin/firmalar");
  const parsed = companyDiscountSchema.safeParse({
    companyId: formData.get("companyId"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    discountRate: formData.get("discountRate"),
    paymentTerms: formData.get("paymentTerms") || undefined,
    creditPolicy: formData.get("creditPolicy"),
    creditLimit: formData.get("creditLimit") || undefined,
    changeReason: formData.get("changeReason"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "İskonto bilgisi geçersiz." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({
        where: { id: parsed.data.companyId },
        select: {
          discountRate: true,
          paymentTerms: true,
          creditPolicy: true,
          creditLimit: true,
          updatedAt: true,
        },
      });
      if (!company) throw new CompanyCommercialTermsError("Firma bulunamadı.");

      const expectedUpdatedAt = new Date(parsed.data.expectedUpdatedAt);
      if (company.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new CompanyCommercialTermsError("Ticari koşullar başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
      }

      const updated = await tx.company.updateMany({
        where: { id: parsed.data.companyId, updatedAt: expectedUpdatedAt },
        data: {
          discountRate: parsed.data.discountRate,
          paymentTerms: parsed.data.paymentTerms ?? null,
          creditPolicy: parsed.data.creditPolicy,
          creditLimit:
            parsed.data.creditPolicy === "LIMITED"
              ? parsed.data.creditLimit
              : null,
        },
      });
      if (updated.count !== 1) {
        throw new CompanyCommercialTermsError("Ticari koşullar başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "company.discount.updated",
          entityType: "Company",
          entityId: parsed.data.companyId,
          metadata: JSON.stringify({
            previousDiscountRate: company.discountRate.toString(),
            discountRate: parsed.data.discountRate,
            previousPaymentTerms: company.paymentTerms,
            paymentTerms: parsed.data.paymentTerms ?? null,
            previousCreditPolicy: company.creditPolicy,
            creditPolicy: parsed.data.creditPolicy,
            previousCreditLimit: company.creditLimit?.toString() ?? null,
            creditLimit:
              parsed.data.creditPolicy === "LIMITED"
                ? parsed.data.creditLimit?.toString()
                : null,
            reason: parsed.data.changeReason,
          }),
        },
      });
    });

    revalidatePath(`/admin/firmalar/${parsed.data.companyId}`);
    revalidatePath("/urunler");
    revalidatePath("/sepet");
    return { ok: true, message: "Ticari koşullar güncellendi." };
  } catch (error) {
    if (error instanceof CompanyCommercialTermsError) {
      return { ok: false, message: error.message };
    }
    const correlationId = getCorrelationId();
    structuredLog("error", "company.commercial_terms.failed", { correlationId, error });
    return {
      ok: false,
      message: `Ticari koşullar güncellenemedi. Destek kodu: ${correlationId}`,
    };
  }
}

function resolveFormData(input: ActivationInvitationInput, maybeFormData?: FormData) {
  return input instanceof FormData ? input : maybeFormData;
}

export async function createActivationInvitation(
  input: ActivationInvitationInput,
  maybeFormData?: FormData,
): Promise<ActivationInvitationState> {
  const actor = await requirePermissionUser("company.user.credentials.manage", "/admin/firmalar");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }

  const parsed = activationInvitationSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Davet bilgileri geçersiz.");
  }

  const manualDeliveryAllowed =
    process.env.NODE_ENV !== "production";
  const emailDeliveryEnabled = process.env.EMAIL_PROVIDER === "smtp";

  if (!manualDeliveryAllowed && !emailDeliveryEnabled) {
    return failure(
      "Production ortamında e-posta teslim adapterı bağlı değil. Manuel bağlantı için açık environment izni gerekir.",
    );
  }
  if (emailDeliveryEnabled) {
    try {
      getEmailConfig();
    } catch {
      return failure("Transactional e-posta teslim ayarları hazır değil.");
    }
  }

  const tokenId = randomUUID();
  const rawToken = deriveActivationToken(tokenId);
  const tokenHash = hashActivationToken(rawToken);
  const expiresAt = getActivationExpiry();

  try {
    const companyId = await prisma.$transaction(async (tx) => {
      const invitedUser = await tx.user.findFirst({
        where: {
          id: parsed.data.userId,
          role: { in: ["DEALER_OWNER", "DEALER_STAFF"] },
        },
        include: { company: { select: { id: true, status: true } } },
      });

      if (!invitedUser) {
        throw new Error("Firma kullanıcısı bulunamadı.");
      }

      if (invitedUser.status !== "INVITED") {
        throw new Error("Yalnızca aktivasyon bekleyen kullanıcılar için davet oluşturulabilir.");
      }

      if (!invitedUser.company || invitedUser.company.status !== "APPROVED") {
        throw new Error("Kullanıcının bağlı olduğu firma aktif onaylı durumda değil.");
      }

      const now = new Date();
      await tx.userActivationToken.updateMany({
        where: {
          userId: invitedUser.id,
          consumedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      await tx.userActivationToken.create({
        data: {
          id: tokenId,
          userId: invitedUser.id,
          tokenHash,
          expiresAt,
        },
      });

      if (emailDeliveryEnabled) {
        await enqueueIntegrationEvent(tx, {
          topic: "credential.activation_requested.v1",
          eventType: "USER_ACTIVATION_REQUESTED",
          aggregateType: "UserActivationToken",
          aggregateId: tokenId,
          payload: { schemaVersion: 1, tokenId, userId: invitedUser.id },
          idempotencyKey: `credential:activation:${tokenId}:v1`,
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "user.activation.invitation.created",
          entityType: "User",
          entityId: invitedUser.id,
          metadata: JSON.stringify({
            companyId: invitedUser.company.id,
            expiresAt: expiresAt.toISOString(),
          }),
        },
      });

      return invitedUser.company.id;
    });

    revalidatePath(`/admin/firmalar/${companyId}`);

    return {
      ok: true,
      message: emailDeliveryEnabled
        ? "Aktivasyon e-postası teslim kuyruğuna alındı."
        : "Tek kullanımlık aktivasyon bağlantısı hazırlandı.",
      activationPath: manualDeliveryAllowed ? `/aktivasyon/${rawToken}` : undefined,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Aktivasyon bağlantısı oluşturulamadı.");
  }
}

export async function createDealerUser(
  _previousState: CompanyUserActionState,
  formData: FormData,
): Promise<CompanyUserActionState> {
  const actor = await requirePermissionUser("company.user.manage", "/admin/firmalar");
  const parsed = dealerUserCreateSchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Kullanıcı bilgileri geçersiz.");

  try {
    const user = await prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({ where: { id: parsed.data.companyId }, select: { status: true } });
      if (!company || company.status !== "APPROVED") throw new Error("Yalnızca onaylı firmalara kullanıcı eklenebilir.");

      const duplicate = await tx.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
      if (duplicate) throw new Error("Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.");

      const created = await tx.user.create({
        data: { ...parsed.data, status: "INVITED", passwordHash: null },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "company.user.created",
          entityType: "User",
          entityId: created.id,
          metadata: JSON.stringify({ companyId: parsed.data.companyId, role: parsed.data.role }),
        },
      });
      return created;
    });

    revalidatePath(`/admin/firmalar/${parsed.data.companyId}`);
    return { ok: true, message: `${user.name} davet bekleyen kullanıcı olarak oluşturuldu.` };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Kullanıcı oluşturulamadı.");
  }
}

export async function changeDealerUserStatus(formData: FormData): Promise<void> {
  const actor = await requirePermissionUser("company.user.manage", "/admin/firmalar");
  const parsed = dealerUserStatusSchema.safeParse({
    companyId: formData.get("companyId"),
    userId: formData.get("userId"),
    targetStatus: formData.get("targetStatus"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Durum bilgisi geçersiz.");

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: { id: parsed.data.userId, companyId: parsed.data.companyId, role: { in: ["DEALER_OWNER", "DEALER_STAFF"] } },
      include: { company: { select: { status: true } } },
    });
    if (!user) throw new Error("Firma kullanıcısı bulunamadı.");

    const allowed =
      (parsed.data.targetStatus === "SUSPENDED" && user.status === "ACTIVE") ||
      (parsed.data.targetStatus === "DISABLED" && ["INVITED", "SUSPENDED"].includes(user.status)) ||
      (parsed.data.targetStatus === "ACTIVE" && user.status === "SUSPENDED" && Boolean(user.passwordHash));
    if (!allowed) throw new Error("Bu kullanıcı için istenen durum geçişine izin verilmiyor.");
    if (parsed.data.targetStatus === "ACTIVE" && user.company?.status !== "APPROVED") {
      throw new Error("Firma onaylı değilken kullanıcı yeniden etkinleştirilemez.");
    }

    const now = new Date();
    await tx.user.update({ where: { id: user.id }, data: { status: parsed.data.targetStatus } });
    if (parsed.data.targetStatus !== "ACTIVE") {
      await tx.authSession.deleteMany({ where: { userId: user.id } });
      await tx.userActivationToken.updateMany({
        where: { userId: user.id, consumedAt: null, revokedAt: null }, data: { revokedAt: now },
      });
      await tx.userPasswordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null, revokedAt: null }, data: { revokedAt: now },
      });
    }
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: `company.user.${parsed.data.targetStatus.toLowerCase()}`,
        entityType: "User",
        entityId: user.id,
        metadata: JSON.stringify({ companyId: parsed.data.companyId, fromStatus: user.status, toStatus: parsed.data.targetStatus }),
      },
    });
  });

  revalidatePath(`/admin/firmalar/${parsed.data.companyId}`);
}

export async function createPasswordResetInvitation(
  _previousState: CompanyUserActionState,
  formData: FormData,
): Promise<CompanyUserActionState> {
  const actor = await requirePermissionUser("company.user.credentials.manage", "/admin/firmalar");
  const parsed = credentialResetInvitationSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Kullanıcı seçimi geçersiz.");

  const manualDeliveryAllowed = process.env.NODE_ENV !== "production";
  const emailDeliveryEnabled = process.env.EMAIL_PROVIDER === "smtp";
  if (!manualDeliveryAllowed && !emailDeliveryEnabled) return failure("Production ortamında e-posta teslim adapterı bağlı değil.");
  if (emailDeliveryEnabled) {
    try {
      getEmailConfig();
    } catch {
      return failure("Transactional e-posta teslim ayarları hazır değil.");
    }
  }

  const tokenId = randomUUID();
  const rawToken = derivePasswordResetToken(tokenId);
  const expiresAt = getPasswordResetExpiry();
  try {
    const companyId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: parsed.data.userId, role: { in: ["DEALER_OWNER", "DEALER_STAFF"] }, status: "ACTIVE" },
        include: { company: { select: { id: true, status: true } } },
      });
      if (!user?.company || user.company.status !== "APPROVED" || !user.passwordHash) {
        throw new Error("Yalnızca aktif bayi kullanıcıları için parola sıfırlama bağlantısı oluşturulabilir.");
      }
      const now = new Date();
      await tx.userPasswordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null, revokedAt: null }, data: { revokedAt: now },
      });
      await tx.userPasswordResetToken.create({
        data: { id: tokenId, userId: user.id, tokenHash: hashPasswordResetToken(rawToken), expiresAt },
      });
      if (emailDeliveryEnabled) {
        await enqueueIntegrationEvent(tx, {
          topic: "credential.password_reset_requested.v1",
          eventType: "USER_PASSWORD_RESET_REQUESTED",
          aggregateType: "UserPasswordResetToken",
          aggregateId: tokenId,
          payload: { schemaVersion: 1, tokenId, userId: user.id },
          idempotencyKey: `credential:password-reset:${tokenId}:v1`,
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "user.password_reset.invitation.created",
          entityType: "User",
          entityId: user.id,
          metadata: JSON.stringify({ companyId: user.company.id, expiresAt: expiresAt.toISOString() }),
        },
      });
      return user.company.id;
    });
    revalidatePath(`/admin/firmalar/${companyId}`);
    return {
      ok: true,
      message: emailDeliveryEnabled
        ? "Parola sıfırlama e-postası teslim kuyruğuna alındı."
        : "Tek kullanımlık parola sıfırlama bağlantısı hazırlandı.",
      resetPath: manualDeliveryAllowed ? `/parola-sifirla/${rawToken}` : undefined,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Parola sıfırlama bağlantısı oluşturulamadı.");
  }
}

export async function createActivationInvitationForm(
  previousState: ActivationInvitationState,
  formData: FormData,
) {
  return createActivationInvitation(previousState, formData);
}
