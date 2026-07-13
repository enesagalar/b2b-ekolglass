import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCount: vi.fn(),
  auditCreate: vi.fn(),
  compare: vi.fn(),
  createUserSession: vi.fn(),
  findUser: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
  updateUser: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ compare: mocks.compare }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: vi.fn(() => null) })),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({
  clearCurrentSession: vi.fn(),
  createUserSession: mocks.createUserSession,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { count: mocks.auditCount, create: mocks.auditCreate },
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
    mocks.auditCount.mockResolvedValue(0);
    mocks.auditCreate.mockResolvedValue({});
    mocks.compare.mockResolvedValue(true);
    mocks.createUserSession.mockResolvedValue(undefined);
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
});
