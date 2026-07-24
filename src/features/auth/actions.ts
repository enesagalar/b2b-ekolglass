"use server";

import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { loginSchema } from "@/domain/validation";
import { isAdminRole, isDealerRole, isKnownRole, type Role } from "@/domain/roles";
import {
  checkLoginRateLimit,
  createLoginFailureData,
  createLoginRateLimitContext,
  type LoginRateLimitContext,
} from "@/features/auth/login-rate-limit";
import { clearCurrentSession, createUserSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveTrustedClientIp } from "@/lib/request-security";

export type LoginState = {
  message: string;
};

const DUMMY_PASSWORD_HASH =
  "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
type AuthenticationResult = { error: string } | { user: { id: string; role: Role } };

async function recordLoginAttempt({
  email,
  ipAddress,
  userAgent,
  userId,
  status,
  reason,
}: {
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  userId?: string;
  status: "succeeded" | "failed" | "throttled";
  reason?: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: `auth.login.${status}`,
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({
        email,
        reason,
        ipAddress,
        userAgent,
      }),
    },
  });
}

async function recordFailedLogin({
  email,
  ipAddress,
  rateLimitContext,
  reason,
  userAgent,
  userId,
}: {
  email: string;
  ipAddress: string | null;
  rateLimitContext: LoginRateLimitContext;
  reason: string;
  userAgent: string | null;
  userId?: string;
}) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.authLoginFailure.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    await tx.authLoginFailure.create({
      data: createLoginFailureData(rateLimitContext, reason, now),
    });
    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        action: "auth.login.failed",
        entityType: "User",
        entityId: userId,
        metadata: JSON.stringify({ email, reason, ipAddress, userAgent }),
      },
    });
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
  const requestHeaders = await headers();
  const ipAddress = resolveTrustedClientIp(requestHeaders);
  const userAgent = requestHeaders.get("user-agent");
  const rateLimitContext = createLoginRateLimitContext(email, ipAddress);
  const rateLimit = await checkLoginRateLimit(rateLimitContext);

  if (rateLimit.limited) {
    await recordLoginAttempt({
      email,
      ipAddress,
      userAgent,
      status: "throttled",
      reason: rateLimit.reason ?? "too_many_failed_attempts",
    });

    return { error: "Çok fazla hatalı deneme yapıldı. Lütfen daha sonra tekrar deneyin." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  const role = isKnownRole(user?.role) ? user.role : null;
  const hasAudienceRole = role && (audience === "dealer" ? isDealerRole(role) : isAdminRole(role));
  const passwordMatches = await compare(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !user.passwordHash || user.status !== "ACTIVE" || !hasAudienceRole || !passwordMatches) {
    await recordFailedLogin({
      email,
      ipAddress,
      rateLimitContext,
      userAgent,
      userId: user?.id,
      reason:
        user && user.passwordHash && user.status === "ACTIVE" && hasAudienceRole
          ? "invalid_password"
          : "invalid_user_status_or_audience",
    });

    return { error: "E-posta veya şifre hatalı." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await tx.authLoginFailure.deleteMany({
      where: { emailKey: rateLimitContext.emailKey },
    });
  });

  await createUserSession(user.id);
  await recordLoginAttempt({
    email,
    ipAddress,
    userAgent,
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

export async function logoutAdmin() {
  await clearCurrentSession();
  redirect("/yonetim/giris");
}
