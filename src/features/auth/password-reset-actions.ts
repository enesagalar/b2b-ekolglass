"use server";

import { hash } from "bcryptjs";
import { headers } from "next/headers";

import { passwordResetSchema } from "@/domain/validation";
import {
  consumeSecurityRateLimit,
  createSecurityRateLimitContext,
  type SecurityRateLimitContext,
} from "@/features/auth/security-rate-limit";
import { hashPasswordResetToken } from "@/lib/password-reset-token";
import { prisma } from "@/lib/prisma";
import { requiresTrustedClientIp, resolveTrustedClientIp } from "@/lib/request-security";

export type PasswordResetState = { ok: boolean; message: string; completed?: boolean };

async function recordResetFailure(
  context: SecurityRateLimitContext,
  fingerprint: string,
  reason: string,
  userId?: string,
) {
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        action: "auth.password_reset.failed",
        entityType: "UserPasswordResetToken",
        entityId: userId,
        metadata: JSON.stringify({ fingerprint, reason }),
      },
    });
  });
}

export async function resetDealerPassword(
  _previousState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = passwordResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Parola bilgileri geçersiz." };
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const fingerprint = tokenHash.slice(0, 16);
  const requestHeaders = await headers();
  const ipAddress = resolveTrustedClientIp(requestHeaders);
  if (requiresTrustedClientIp() && !ipAddress) {
    return { ok: false, message: "İstek güvenlik doğrulamasından geçemedi. Lütfen daha sonra tekrar deneyin." };
  }
  const rateLimitContext = createSecurityRateLimitContext(
    "PASSWORD_RESET",
    tokenHash,
    ipAddress,
  );
  if ((await consumeSecurityRateLimit(rateLimitContext)).limited) {
    return { ok: false, message: "Çok fazla başarısız deneme yapıldı. Lütfen daha sonra tekrar deneyin." };
  }

  const candidate = await prisma.userPasswordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { company: { select: { status: true } } } } },
  });
  const now = new Date();
  if (
    !candidate || candidate.expiresAt <= now || candidate.consumedAt || candidate.revokedAt ||
    candidate.user.status !== "ACTIVE" || !["DEALER_OWNER", "DEALER_STAFF"].includes(candidate.user.role) ||
    candidate.user.company?.status !== "APPROVED"
  ) {
    await recordResetFailure(rateLimitContext, fingerprint, "invalid_or_expired_token", candidate?.userId);
    return { ok: false, message: "Parola sıfırlama bağlantısı geçersiz, kullanılmış veya süresi dolmuş." };
  }

  const passwordHash = await hash(parsed.data.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const token = await tx.userPasswordResetToken.findUnique({
        where: { tokenHash },
        include: { user: { include: { company: { select: { status: true } } } } },
      });
      if (
        !token || token.expiresAt <= now || token.consumedAt || token.revokedAt ||
        token.user.status !== "ACTIVE" || !["DEALER_OWNER", "DEALER_STAFF"].includes(token.user.role) ||
        token.user.company?.status !== "APPROVED"
      ) throw new Error("invalid_token");

      const consumed = await tx.userPasswordResetToken.updateMany({
        where: { id: token.id, consumedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw new Error("concurrent_token_use");

      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
      await tx.authSession.deleteMany({ where: { userId: token.userId } });
      await tx.userPasswordResetToken.updateMany({
        where: { userId: token.userId, id: { not: token.id }, consumedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: token.userId,
          action: "auth.password_reset.succeeded",
          entityType: "User",
          entityId: token.userId,
        },
      });
      await tx.securityRateLimitBucket.deleteMany({
        where: {
          scope: rateLimitContext.scope,
          keyType: "SUBJECT",
          keyHash: rateLimitContext.subjectKey,
        },
      });
    });
    return { ok: true, completed: true, message: "Parolanız yenilendi. Yeni parolanızla giriş yapabilirsiniz." };
  } catch (error) {
    await recordResetFailure(
      rateLimitContext,
      fingerprint,
      error instanceof Error ? error.message : "reset_failed",
      candidate.userId,
    ).catch(() => undefined);
    return { ok: false, message: "Parola sıfırlama bağlantısı geçersiz, kullanılmış veya süresi dolmuş." };
  }
}
