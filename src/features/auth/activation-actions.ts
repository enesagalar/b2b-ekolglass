"use server";

import { hash } from "bcryptjs";
import { headers } from "next/headers";

import { accountActivationSchema } from "@/domain/validation";
import { hashActivationToken } from "@/lib/activation-token";
import { prisma } from "@/lib/prisma";

export type AccountActivationState = {
  ok: boolean;
  message: string;
  activated?: boolean;
};

const FAILED_ACTIVATION_WINDOW_MINUTES = 15;
const MAX_FAILED_ACTIVATION_ATTEMPTS = 8;

class AccountActivationError extends Error {}

async function recordActivationFailure(fingerprint: string, reason: string) {
  const requestHeaders = await headers();

  await prisma.auditLog.create({
    data: {
      action: "auth.activation.failed",
      entityType: "UserActivationToken",
      metadata: JSON.stringify({
        fingerprint,
        reason,
        ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: requestHeaders.get("user-agent"),
      }),
    },
  });
}

async function getFailedActivationCount(fingerprint: string) {
  const since = new Date(Date.now() - FAILED_ACTIVATION_WINDOW_MINUTES * 60 * 1000);

  return prisma.auditLog.count({
    where: {
      action: "auth.activation.failed",
      entityType: "UserActivationToken",
      createdAt: { gte: since },
      metadata: { contains: fingerprint },
    },
  });
}

export async function activateInvitedAccount(
  _previousState: AccountActivationState,
  formData: FormData,
): Promise<AccountActivationState> {
  const parsed = accountActivationSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Aktivasyon bilgileri geçersiz." };
  }

  const tokenHash = hashActivationToken(parsed.data.token);
  const fingerprint = tokenHash.slice(0, 16);

  if ((await getFailedActivationCount(fingerprint)) >= MAX_FAILED_ACTIVATION_ATTEMPTS) {
    return { ok: false, message: "Çok fazla başarısız deneme yapıldı. Lütfen daha sonra tekrar deneyin." };
  }

  const candidate = await prisma.userActivationToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { company: true } } },
  });
  const now = new Date();

  if (
    !candidate ||
    candidate.expiresAt <= now ||
    candidate.consumedAt ||
    candidate.revokedAt ||
    candidate.user.status !== "INVITED" ||
    candidate.user.passwordHash ||
    !["DEALER_OWNER", "DEALER_STAFF"].includes(candidate.user.role) ||
    !candidate.user.companyId ||
    candidate.user.company?.status !== "APPROVED"
  ) {
    await recordActivationFailure(fingerprint, "invalid_or_expired_token");
    return { ok: false, message: "Aktivasyon bağlantısı geçersiz, kullanılmış veya süresi dolmuş." };
  }

  const passwordHash = await hash(parsed.data.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const activationToken = await tx.userActivationToken.findUnique({
        where: { tokenHash },
        include: { user: { include: { company: true } } },
      });

      if (
        !activationToken ||
        activationToken.expiresAt <= now ||
        activationToken.consumedAt ||
        activationToken.revokedAt ||
        activationToken.user.status !== "INVITED" ||
        activationToken.user.passwordHash ||
        !["DEALER_OWNER", "DEALER_STAFF"].includes(activationToken.user.role) ||
        !activationToken.user.companyId ||
        activationToken.user.company?.status !== "APPROVED"
      ) {
        throw new AccountActivationError("invalid_or_expired_token");
      }

      const consumed = await tx.userActivationToken.updateMany({
        where: {
          id: activationToken.id,
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        throw new AccountActivationError("concurrent_token_use");
      }

      await tx.user.update({
        where: { id: activationToken.user.id },
        data: {
          status: "ACTIVE",
          passwordHash,
        },
      });

      await tx.authSession.deleteMany({ where: { userId: activationToken.user.id } });

      await tx.userActivationToken.updateMany({
        where: {
          userId: activationToken.user.id,
          id: { not: activationToken.id },
          consumedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: activationToken.user.id,
          action: "auth.activation.succeeded",
          entityType: "User",
          entityId: activationToken.user.id,
          metadata: JSON.stringify({ companyId: activationToken.user.companyId }),
        },
      });
    });

    return {
      ok: true,
      activated: true,
      message: "Hesabınız aktifleştirildi. E-posta adresiniz ve yeni parolanızla giriş yapabilirsiniz.",
    };
  } catch (error) {
    const reason = error instanceof AccountActivationError ? error.message : "activation_failed";
    await recordActivationFailure(fingerprint, reason);
    return { ok: false, message: "Aktivasyon bağlantısı geçersiz, kullanılmış veya süresi dolmuş." };
  }
}
