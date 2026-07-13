"use server";

import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { loginSchema } from "@/domain/validation";
import { isAdminRole, isDealerRole, isKnownRole, type Role } from "@/domain/roles";
import { clearCurrentSession, createUserSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  message: string;
};

const FAILED_LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_LOGIN_ATTEMPTS = 8;
type AuthenticationResult = { error: string } | { user: { id: string; role: Role } };

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

function resolveSafeNext(value: FormDataEntryValue | null, audience: "dealer" | "admin") {
  if (audience === "dealer") return "/";

  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }

  const allowed = value === "/admin" || value.startsWith("/admin/");

  return allowed ? value : "/admin";
}

async function authenticateWithPassword(formData: FormData, audience: "dealer" | "admin"): Promise<AuthenticationResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Giriş bilgileri geçersiz." };
  }

  const email = parsed.data.email.toLowerCase();
  const failedLoginCount = await getFailedLoginCount(email);

  if (failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
    await recordLoginAttempt({
      email,
      status: "throttled",
      reason: "too_many_failed_attempts",
    });

    return { error: "Çok fazla hatalı deneme yapıldı. Lütfen daha sonra tekrar deneyin." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  const role = isKnownRole(user?.role) ? user.role : null;
  const hasAudienceRole = role && (audience === "dealer" ? isDealerRole(role) : isAdminRole(role));

  if (!user || !user.passwordHash || user.status !== "ACTIVE" || !hasAudienceRole) {
    await recordLoginAttempt({
      email,
      userId: user?.id,
      status: "failed",
      reason: "invalid_user_status_or_audience",
    });

    return { error: "E-posta veya şifre hatalı." };
  }

  const passwordMatches = await compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    await recordLoginAttempt({
      email,
      userId: user.id,
      status: "failed",
      reason: "invalid_password",
    });

    return { error: "E-posta veya şifre hatalı." };
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

  return { user: { id: user.id, role: user.role as Role } };
}

export async function loginWithPassword(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const result = await authenticateWithPassword(formData, "dealer");

  if ("error" in result) {
    return { message: result.error };
  }

  redirect(resolveSafeNext(formData.get("next"), "dealer"));
}

export async function loginAdminWithPassword(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const result = await authenticateWithPassword(formData, "admin");

  if ("error" in result) {
    return { message: result.error };
  }

  redirect(resolveSafeNext(formData.get("next"), "admin"));
}

export async function logout() {
  await clearCurrentSession();
  redirect("/giris");
}
