"use server";

import { hash } from "bcryptjs";
import { headers } from "next/headers";

import { passwordResetSchema } from "@/domain/validation";
import { hashPasswordResetToken } from "@/lib/password-reset-token";
import { prisma } from "@/lib/prisma";

export type PasswordResetState = { ok: boolean; message: string; completed?: boolean };

const FAILED_RESET_WINDOW_MINUTES = 15;
const MAX_FAILED_RESET_ATTEMPTS = 8;

async function recordResetFailure(fingerprint: string, reason: string, userId?: string) {
  const requestHeaders = await headers();
  await prisma.auditLog.create({
    data: {
      action: "auth.password_reset.failed",
      entityType: "UserPasswordResetToken",
      entityId: userId,
      metadata: JSON.stringify({
        fingerprint,
        reason,
        ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: requestHeaders.get("user-agent"),
      }),
    },
  });
}

async function getFailedResetCount(fingerprint: string) {
  return prisma.auditLog.count({
    where: {
      action: "auth.password_reset.failed",
      entityType: "UserPasswordResetToken",
      createdAt: { gte: new Date(Date.now() - FAILED_RESET_WINDOW_MINUTES * 60 * 1000) },
      metadata: { contains: fingerprint },
    },
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
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Parola bilgileri geçersiz." };

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const fingerprint = tokenHash.slice(0, 16);
  if ((await getFailedResetCount(fingerprint)) >= MAX_FAILED_RESET_ATTEMPTS) {
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
    await recordResetFailure(fingerprint, "invalid_or_expired_token", candidate?.userId);
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
        data: { actorUserId: token.userId, action: "auth.password_reset.succeeded", entityType: "User", entityId: token.userId },
      });
    });
    return { ok: true, completed: true, message: "Parolanız yenilendi. Yeni parolanızla giriş yapabilirsiniz." };
  } catch (error) {
    await recordResetFailure(fingerprint, error instanceof Error ? error.message : "reset_failed", candidate.userId);
    return { ok: false, message: "Parola sıfırlama bağlantısı geçersiz, kullanılmış veya süresi dolmuş." };
  }
}
