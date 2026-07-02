"use server";

import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { loginSchema } from "@/domain/validation";
import { clearCurrentSession, createUserSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  message: string;
};

const FAILED_LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_LOGIN_ATTEMPTS = 8;

async function getFailedLoginCount(email: string) {
  const since = new Date(Date.now() - FAILED_LOGIN_WINDOW_MINUTES * 60 * 1000);

  return prisma.auditLog.count({
    where: {
      action: "auth.login.failed",
      entityType: "User",
      createdAt: { gte: since },
      metadata: { contains: email },
    },
  });
}

async function recordLoginAttempt({
  email,
  userId,
  status,
  reason,
}: {
  email: string;
  userId?: string;
  status: "succeeded" | "failed" | "throttled";
  reason?: string;
}) {
  const requestHeaders = await headers();

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: `auth.login.${status}`,
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({
        email,
        reason,
        ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: requestHeaders.get("user-agent"),
      }),
    },
  });
}

export async function loginWithPassword(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Giriş bilgileri geçersiz." };
  }

  const email = parsed.data.email.toLowerCase();
  const failedLoginCount = await getFailedLoginCount(email);

  if (failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
    await recordLoginAttempt({
      email,
      status: "throttled",
      reason: "too_many_failed_attempts",
    });

    return { message: "Çok fazla hatalı deneme yapıldı. Lütfen daha sonra tekrar deneyin." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash || user.status !== "ACTIVE") {
    await recordLoginAttempt({
      email,
      userId: user?.id,
      status: "failed",
      reason: "invalid_user_or_status",
    });

    return { message: "E-posta veya şifre hatalı." };
  }

  const passwordMatches = await compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    await recordLoginAttempt({
      email,
      userId: user.id,
      status: "failed",
      reason: "invalid_password",
    });

    return { message: "E-posta veya şifre hatalı." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createUserSession(user.id);
  await recordLoginAttempt({
    email,
    userId: user.id,
    status: "succeeded",
  });
  redirect("/admin");
}

export async function logout() {
  await clearCurrentSession();
  redirect("/giris");
}
