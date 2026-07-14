import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  authFailureCreate: vi.fn(),
  authFailureDeleteMany: vi.fn(),
  checkLoginRateLimit: vi.fn(),
  compare: vi.fn(),
  createLoginFailureData: vi.fn(),
  createLoginRateLimitContext: vi.fn(),
  createUserSession: vi.fn(),
  findUser: vi.fn(),
  resolveTrustedClientIp: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
  updateUser: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ compare: mocks.compare }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: vi.fn((name: string) => name === "user-agent" ? "vitest-agent" : null),
  })),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({
  clearCurrentSession: vi.fn(),
  createUserSession: mocks.createUserSession,
}));
vi.mock("@/features/auth/login-rate-limit", () => ({
  checkLoginRateLimit: mocks.checkLoginRateLimit,
  createLoginFailureData: mocks.createLoginFailureData,
  createLoginRateLimitContext: mocks.createLoginRateLimitContext,
}));
vi.mock("@/lib/request-security", () => ({
  resolveTrustedClientIp: mocks.resolveTrustedClientIp,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback) => callback({
      auditLog: { create: mocks.auditCreate },
      authLoginFailure: {
        create: mocks.authFailureCreate,
        deleteMany: mocks.authFailureDeleteMany,
      },
      user: { update: mocks.updateUser },
    })),
    auditLog: { create: mocks.auditCreate },
    authLoginFailure: { deleteMany: mocks.authFailureDeleteMany },
    user: { findUnique: mocks.findUser, update: mocks.updateUser },
  },
}));

import { loginAdminWithPassword, loginWithPassword } from "./actions";

function loginForm(next: string) {
  const formData = new FormData();
  formData.set("email", "user@example.com");
  formData.set("password", "SecurePassword123");
  formData.set("next", next);
  return formData;
}

describe("login redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auditCreate.mockResolvedValue({});
    mocks.authFailureCreate.mockResolvedValue({});
    mocks.authFailureDeleteMany.mockResolvedValue({ count: 0 });
    mocks.checkLoginRateLimit.mockResolvedValue({ limited: false, reason: null });
    mocks.compare.mockResolvedValue(true);
    mocks.createLoginFailureData.mockReturnValue({
      emailKey: "email-key",
      ipKey: "ip-key",
      reason: "invalid_password",
      expiresAt: new Date("2026-07-15T00:00:00.000Z"),
      createdAt: new Date("2026-07-14T00:00:00.000Z"),
    });
    mocks.createLoginRateLimitContext.mockReturnValue({
      emailKey: "email-key",
      ipKey: "ip-key",
    });
    mocks.createUserSession.mockResolvedValue(undefined);
    mocks.resolveTrustedClientIp.mockReturnValue("203.0.113.10");
    mocks.updateUser.mockResolvedValue({});
  });

  it("always lands a dealer login on the public home page", async () => {
    mocks.findUser.mockResolvedValue({
      id: "dealer-1",
      email: "user@example.com",
      passwordHash: "hash",
      role: "DEALER_OWNER",
      status: "ACTIVE",
    });

    await expect(loginWithPassword({ message: "" }, loginForm("/bayi/urunler"))).rejects.toThrow("redirect:/");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("keeps admin redirects inside the admin area", async () => {
    mocks.findUser.mockResolvedValue({
      id: "admin-1",
      email: "user@example.com",
      passwordHash: "hash",
      role: "ADMIN",
      status: "ACTIVE",
    });

    await expect(loginAdminWithPassword({ message: "" }, loginForm("/urunler"))).rejects.toThrow("redirect:/admin");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });

  it("rejects a rate-limited email before loading the user", async () => {
    mocks.checkLoginRateLimit.mockResolvedValue({
      limited: true,
      reason: "email_limit",
    });

    const state = await loginWithPassword({ message: "" }, loginForm("/"));

    expect(state.message).toContain("Çok fazla hatalı deneme");
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "auth.login.throttled",
        metadata: expect.stringContaining("email_limit"),
      }),
    });
  });

  it("records failed password attempts in the indexed limiter and audit log", async () => {
    mocks.compare.mockResolvedValue(false);
    mocks.findUser.mockResolvedValue({
      id: "dealer-1",
      email: "user@example.com",
      passwordHash: "hash",
      role: "DEALER_OWNER",
      status: "ACTIVE",
    });

    const state = await loginWithPassword({ message: "" }, loginForm("/"));

    expect(state.message).toBe("E-posta veya şifre hatalı.");
    expect(mocks.authFailureCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ emailKey: "email-key", ipKey: "ip-key" }),
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "auth.login.failed" }),
    });
  });

  it("runs a dummy password comparison for unknown users", async () => {
    mocks.compare.mockResolvedValue(false);
    mocks.findUser.mockResolvedValue(null);

    await loginWithPassword({ message: "" }, loginForm("/"));

    expect(mocks.compare).toHaveBeenCalledOnce();
    expect(mocks.compare.mock.calls[0]?.[1]).toMatch(/^\$2b\$/);
    expect(mocks.authFailureCreate).toHaveBeenCalledOnce();
  });

  it("clears account failures after successful authentication", async () => {
    mocks.findUser.mockResolvedValue({
      id: "dealer-1",
      email: "user@example.com",
      passwordHash: "hash",
      role: "DEALER_OWNER",
      status: "ACTIVE",
    });

    await expect(loginWithPassword({ message: "" }, loginForm("/"))).rejects.toThrow("redirect:/");

    expect(mocks.authFailureDeleteMany).toHaveBeenCalledWith({
      where: { emailKey: "email-key" },
    });
    expect(mocks.createUserSession).toHaveBeenCalledWith("dealer-1");
  });
});
