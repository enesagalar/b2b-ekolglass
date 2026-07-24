import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCompany: vi.fn(),
  findCart: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: { findUnique: mocks.findCompany },
    orderCart: { findUnique: mocks.findCart },
  },
}));

import { getCommerceIdentity } from "./commerce";

describe("commerce identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findCart.mockResolvedValue(null);
  });

  it("exposes an admin identity without looking up a dealer company", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      name: "Admin User",
      role: "SUPER_ADMIN",
      companyId: null,
    });

    await expect(getCommerceIdentity()).resolves.toEqual({
      audience: "admin",
      name: "Admin User",
    });
    expect(mocks.findCompany).not.toHaveBeenCalled();
  });

  it("exposes an approved dealer identity with its company", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "dealer-1",
      name: "Dealer User",
      role: "DEALER_OWNER",
      companyId: "company-1",
    });
    mocks.findCompany.mockResolvedValue({
      displayName: "Ekol Dealer",
      status: "APPROVED",
    });
    mocks.findCart.mockResolvedValue({
      items: [{ quantity: 2 }, { quantity: 3 }],
    });

    await expect(getCommerceIdentity()).resolves.toEqual({
      audience: "dealer",
      name: "Dealer User",
      companyId: "company-1",
      companyName: "Ekol Dealer",
      cartQuantity: 5,
    });
    expect(mocks.findCompany).toHaveBeenCalledWith({
      where: { id: "company-1" },
      select: { displayName: true, status: true },
    });
    expect(mocks.findCart).toHaveBeenCalledWith({
      where: {
        companyId_ownerUserId: {
          companyId: "company-1",
          ownerUserId: "dealer-1",
        },
      },
      select: { items: { select: { quantity: true } } },
    });
  });

  it("does not expose an unapproved dealer as an authenticated commerce identity", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "dealer-2",
      name: "Pending Dealer",
      role: "DEALER_STAFF",
      companyId: "company-2",
    });
    mocks.findCompany.mockResolvedValue({
      displayName: "Pending Company",
      status: "PENDING",
    });

    await expect(getCommerceIdentity()).resolves.toBeNull();
  });
});
