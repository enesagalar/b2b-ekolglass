import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => {
  let sessionToken: string | undefined;

  return {
    cookieStore: {
      delete: vi.fn((name: string) => {
        if (name === "ekolglass_session") sessionToken = undefined;
      }),
      get: vi.fn((name: string) => name === "ekolglass_session" && sessionToken
        ? { name, value: sessionToken }
        : undefined),
      set: vi.fn((name: string, value: string) => {
        if (name === "ekolglass_session") sessionToken = value;
      }),
    },
    headers: {
      get: vi.fn((name: string) => name === "user-agent" ? "vitest-auth-agent" : null),
    },
    readSessionToken: () => sessionToken,
    setSessionToken: (value?: string) => {
      sessionToken = value;
    },
  };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => request.cookieStore),
  headers: vi.fn(async () => request.headers),
}));

import {
  clearCurrentSession,
  createUserSession,
  getCurrentUser,
  hashSessionToken,
  SESSION_COOKIE,
} from "./auth";
import { prisma } from "./prisma";

const userIds: string[] = [];

async function createUser(role: "ADMIN" | "DEALER_OWNER", status = "ACTIVE") {
  const id = randomUUID();
  userIds.push(id);

  return prisma.user.create({
    data: {
      id,
      email: `${id}@auth.integration.test`,
      name: `${role} integration user`,
      role,
      status,
    },
  });
}

afterEach(async () => {
  request.setSessionToken();
  vi.clearAllMocks();
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  userIds.length = 0;
});

describe("auth sessions", () => {
  it("replaces the current admin session with a separate dealer session", async () => {
    const admin = await createUser("ADMIN");
    const dealer = await createUser("DEALER_OWNER");

    await createUserSession(admin.id);
    const adminToken = request.readSessionToken();

    expect(adminToken).toBeTruthy();
    await expect(getCurrentUser()).resolves.toMatchObject({ id: admin.id, role: "ADMIN", companyId: null });

    await createUserSession(dealer.id);
    const dealerToken = request.readSessionToken();

    expect(dealerToken).toBeTruthy();
    expect(dealerToken).not.toBe(adminToken);
    await expect(getCurrentUser()).resolves.toMatchObject({ id: dealer.id, role: "DEALER_OWNER", companyId: null });
    await expect(prisma.authSession.findUnique({
      where: { tokenHash: hashSessionToken(adminToken!) },
    })).resolves.toBeNull();
  });

  it("rejects missing, invalid, expired, and inactive-user sessions", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();

    request.setSessionToken("invalid-session-token");
    await expect(getCurrentUser()).resolves.toBeNull();

    const expiredUser = await createUser("DEALER_OWNER");
    const expiredToken = randomUUID();
    await prisma.authSession.create({
      data: {
        userId: expiredUser.id,
        tokenHash: hashSessionToken(expiredToken),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    request.setSessionToken(expiredToken);
    await expect(getCurrentUser()).resolves.toBeNull();

    const inactiveUser = await createUser("ADMIN", "SUSPENDED");
    const inactiveToken = randomUUID();
    await prisma.authSession.create({
      data: {
        userId: inactiveUser.id,
        tokenHash: hashSessionToken(inactiveToken),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    request.setSessionToken(inactiveToken);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("invalidates the persisted session and removes its cookie on logout", async () => {
    const dealer = await createUser("DEALER_OWNER");
    await createUserSession(dealer.id);
    const token = request.readSessionToken();

    await clearCurrentSession();

    expect(request.cookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE);
    expect(request.readSessionToken()).toBeUndefined();
    await expect(prisma.authSession.findUnique({
      where: { tokenHash: hashSessionToken(token!) },
    })).resolves.toBeNull();
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
