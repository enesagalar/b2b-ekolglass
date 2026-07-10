import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    auditLog: { create: vi.fn() },
    company: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    customerGroup: { findUnique: vi.fn() },
    dealerApplication: { findUnique: vi.fn(), update: vi.fn() },
    user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };

  return {
    revalidatePath: vi.fn(),
    requirePermissionUser: vi.fn(),
    transaction: vi.fn(),
    tx,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { reviewDealerApplication } from "./admin-actions";

const updatedAt = new Date("2026-07-10T10:00:00.000Z");

function application(overrides: Record<string, unknown> = {}) {
  return {
    id: "application-1",
    companyName: "Ekol Test Cam Ltd.",
    contactName: "Test Yetkili",
    email: "TEST@EXAMPLE.COM",
    phone: "+90 212 000 00 00",
    city: "İstanbul",
    taxNumber: "1234567890",
    customerType: "Bayi",
    message: null,
    status: "NEW",
    companyId: null,
    reviewedById: null,
    reviewedAt: null,
    internalNotes: null,
    createdAt: updatedAt,
    updatedAt,
    ...overrides,
  };
}

function reviewForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("id", "application-1");
  formData.set("expectedUpdatedAt", updatedAt.toISOString());
  formData.set("status", "IN_REVIEW");
  formData.set("internalNotes", "Finansal evraklar kontrol ediliyor.");

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

describe("dealer application admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermissionUser.mockResolvedValue({ id: "admin-1" });
    mocks.transaction.mockImplementation(async (callback) => callback(mocks.tx));
    mocks.tx.dealerApplication.findUnique.mockResolvedValue(application());
    mocks.tx.dealerApplication.update.mockImplementation(async ({ data }) => ({
      ...application(),
      ...data,
    }));
    mocks.tx.customerGroup.findUnique.mockResolvedValue({ id: "group-1" });
    mocks.tx.company.findFirst.mockResolvedValue(null);
    mocks.tx.company.create.mockResolvedValue({ id: "dealer-company-application-1" });
    mocks.tx.company.update.mockResolvedValue({ id: "dealer-company-application-1" });
    mocks.tx.user.findUnique.mockResolvedValue(null);
    mocks.tx.user.create.mockResolvedValue({ id: "dealer-owner-application-1" });
    mocks.tx.user.update.mockResolvedValue({ id: "dealer-owner-application-1" });
    mocks.tx.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("requires the dealer application review permission", async () => {
    await reviewDealerApplication(reviewForm());

    expect(mocks.requirePermissionUser).toHaveBeenCalledWith(
      "dealer.application.review",
      "/admin/bayi-basvurulari",
    );
  });

  it("updates review status without provisioning a company", async () => {
    const state = await reviewDealerApplication(reviewForm());

    expect(state.ok).toBe(true);
    expect(mocks.tx.company.create).not.toHaveBeenCalled();
    expect(mocks.tx.user.create).not.toHaveBeenCalled();
    expect(mocks.tx.dealerApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "application-1" },
        data: expect.objectContaining({ status: "IN_REVIEW", reviewedById: "admin-1" }),
      }),
    );
    expect(mocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "dealer_application.review", actorUserId: "admin-1" }),
      }),
    );
  });

  it("provisions one approved company and invited dealer owner atomically", async () => {
    const state = await reviewDealerApplication(
      reviewForm({
        status: "APPROVED",
        customerGroupId: "group-1",
        paymentTerms: "30 gün vadeli",
        creditLimit: "250000",
      }),
    );

    expect(state).toEqual(
      expect.objectContaining({
        ok: true,
        companyId: "dealer-company-application-1",
        userId: "dealer-owner-application-1",
      }),
    );
    expect(mocks.tx.company.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: "dealer-company-application-1",
          email: "test@example.com",
          customerGroupId: "group-1",
          status: "APPROVED",
        }),
      }),
    );
    expect(mocks.tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: "dealer-owner-application-1",
          email: "test@example.com",
          role: "DEALER_OWNER",
          status: "INVITED",
          passwordHash: null,
        }),
      }),
    );
    expect(mocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "dealer_application.approve" }) }),
    );
  });

  it("rejects approval without a customer group before opening a transaction", async () => {
    const state = await reviewDealerApplication(reviewForm({ status: "APPROVED" }));

    expect(state.ok).toBe(false);
    expect(state.message).toContain("müşteri grubu");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects stale review forms", async () => {
    mocks.tx.dealerApplication.findUnique.mockResolvedValue(
      application({ updatedAt: new Date("2026-07-10T10:05:00.000Z") }),
    );

    const state = await reviewDealerApplication(reviewForm());

    expect(state.ok).toBe(false);
    expect(state.message).toContain("başka bir kullanıcı");
    expect(mocks.tx.dealerApplication.update).not.toHaveBeenCalled();
    expect(mocks.tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("blocks unsafe transitions from approved applications", async () => {
    mocks.tx.dealerApplication.findUnique.mockResolvedValue(
      application({ status: "APPROVED", companyId: "company-1" }),
    );

    const state = await reviewDealerApplication(reviewForm({ status: "REJECTED" }));

    expect(state.ok).toBe(false);
    expect(state.message).toContain("doğrudan geçilemez");
    expect(mocks.tx.dealerApplication.update).not.toHaveBeenCalled();
  });

  it("stops provisioning when the application email belongs to another account", async () => {
    mocks.tx.user.findUnique.mockResolvedValue({
      id: "existing-user",
      email: "test@example.com",
      companyId: "another-company",
      role: "DEALER_OWNER",
    });

    const state = await reviewDealerApplication(
      reviewForm({ status: "APPROVED", customerGroupId: "group-1" }),
    );

    expect(state.ok).toBe(false);
    expect(state.message).toContain("başka bir kullanıcı hesabında");
    expect(mocks.tx.company.create).not.toHaveBeenCalled();
    expect(mocks.tx.user.create).not.toHaveBeenCalled();
  });

  it("reuses only the existing dealer owner linked to the approved company", async () => {
    mocks.tx.dealerApplication.findUnique.mockResolvedValue(
      application({ status: "APPROVED", companyId: "company-1" }),
    );
    mocks.tx.user.findUnique.mockResolvedValue({
      id: "owner-1",
      email: "test@example.com",
      companyId: "company-1",
      role: "DEALER_OWNER",
    });
    mocks.tx.user.update.mockResolvedValue({ id: "owner-1" });

    const state = await reviewDealerApplication(
      reviewForm({ status: "APPROVED", customerGroupId: "group-1" }),
    );

    expect(state.ok).toBe(true);
    expect(mocks.tx.company.create).not.toHaveBeenCalled();
    expect(mocks.tx.user.create).not.toHaveBeenCalled();
    expect(mocks.tx.company.update).toHaveBeenCalled();
    expect(mocks.tx.user.update).toHaveBeenCalledWith({
      where: { id: "owner-1" },
      data: { name: "Test Yetkili" },
    });
  });
});
