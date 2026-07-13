import "server-only";

import { randomBytes, createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasPermission, isAdminRole, isKnownRole, type Permission, type Role } from "@/domain/roles";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "ekolglass_session";
const SESSION_DAYS = 14;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function createUserSession(userId: string) {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;

  await prisma.$transaction(async (tx) => {
    if (currentToken) {
      await tx.authSession.deleteMany({ where: { tokenHash: hashSessionToken(currentToken) } });
    }
    await tx.authSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: requestHeaders.get("user-agent"),
      },
    });
  });

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          companyId: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!session || session.user.status !== "ACTIVE") {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.authSession.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/yonetim/giris?next=/admin");
  }

  if (!isAdminRole(user.role as Role)) {
    redirect("/");
  }

  return user;
}

export async function requirePermissionUser(permission: Permission, nextPath = "/admin") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/yonetim/giris?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isKnownRole(user.role) || !hasPermission(user.role, permission)) {
    redirect("/admin");
  }

  return user;
}
