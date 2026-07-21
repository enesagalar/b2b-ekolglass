import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  companyFindUnique: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: <T extends (...args: never[]) => unknown>(callback: T) => callback }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: { company: { findUnique: mocks.companyFindUnique } },
}));

import { requireDealerContext } from "@/data/dealer-context";

describe("dealer company access boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "dealer-1",
      role: "DEALER_OWNER",
      status: "ACTIVE",
      companyId: "company-1",
    });
  });

  it("rejects an active dealer user when the company is suspended", async () => {
    mocks.companyFindUnique.mockResolvedValue({ id: "company-1", status: "SUSPENDED" });

    await expect(requireDealerContext("/bayi/siparisler")).rejects.toThrow(
      "REDIRECT:/giris?error=dealer-company",
    );
  });

  it("returns the dealer context only for an approved company", async () => {
    const company = { id: "company-1", displayName: "Test Bayi", status: "APPROVED" };
    mocks.companyFindUnique.mockResolvedValue(company);

    await expect(requireDealerContext("/bayi")).resolves.toEqual({
      user: expect.objectContaining({ id: "dealer-1", companyId: "company-1" }),
      company,
    });
  });
});
