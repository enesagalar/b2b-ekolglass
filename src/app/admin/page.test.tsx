import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  dealerCount: vi.fn(),
  orderCount: vi.fn(),
  stockCount: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePermissionUser: mocks.requirePermissionUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    dealerApplication: { count: mocks.dealerCount, findMany: vi.fn() },
    order: { count: mocks.orderCount },
    stockItem: { count: mocks.stockCount, findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
    shippingProvider: { findMany: vi.fn() },
  },
}));
vi.mock("@/integrations/outbox-health", () => ({ getOutboxHealth: vi.fn() }));
vi.mock("@/features/auth/rate-limit-operations", () => ({ getLoginSecurityHealth: vi.fn() }));

import AdminPage from "./page";

describe("admin dashboard permission boundary", () => {
  it("checks dashboard permission before loading operational data", async () => {
    mocks.requirePermissionUser.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(AdminPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.requirePermissionUser).toHaveBeenCalledWith("admin.dashboard.read", "/admin");
    expect(mocks.dealerCount).not.toHaveBeenCalled();
    expect(mocks.orderCount).not.toHaveBeenCalled();
    expect(mocks.stockCount).not.toHaveBeenCalled();
  });
});
