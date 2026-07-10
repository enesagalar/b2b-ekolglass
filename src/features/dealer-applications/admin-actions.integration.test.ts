import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requirePermissionUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));

import { prisma } from "@/lib/prisma";
import { reviewDealerApplication } from "./admin-actions";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const applicationId = `integration-application-${suffix}`;
const customerGroupId = `integration-group-${suffix}`;
const customerGroupCode = `INT-${suffix}`;
const email = `integration-${suffix}@example.com`;

function approvalForm(expectedUpdatedAt: Date) {
  const formData = new FormData();
  formData.set("id", applicationId);
  formData.set("expectedUpdatedAt", expectedUpdatedAt.toISOString());
  formData.set("status", "APPROVED");
  formData.set("customerGroupId", customerGroupId);
  formData.set("paymentTerms", "30 gün vadeli");
  formData.set("creditLimit", "125000");
  formData.set("internalNotes", "Integration onay testi");
  return formData;
}

describe("dealer application approval with SQLite", () => {
  beforeAll(async () => {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"] } },
      select: { id: true },
    });

    if (!admin) {
      throw new Error("Integration test requires a seeded admin user.");
    }

    mocks.requirePermissionUser.mockResolvedValue({ id: admin.id });

    await prisma.customerGroup.create({
      data: {
        id: customerGroupId,
        code: customerGroupCode,
        name: "Integration Bayi Grubu",
      },
    });

    await prisma.dealerApplication.create({
      data: {
        id: applicationId,
        companyName: "Integration Cam Ltd.",
        contactName: "Integration Yetkili",
        email,
        phone: "+90 212 111 22 33",
        city: "İstanbul",
        taxNumber: `TAX-${suffix}`,
        customerType: "Bayi",
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { entityType: "DealerApplication", entityId: applicationId },
    });
    await prisma.dealerApplication.deleteMany({ where: { id: applicationId } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.company.deleteMany({ where: { id: `dealer-company-${applicationId}` } });
    await prisma.customerGroup.deleteMany({ where: { id: customerGroupId } });
    await prisma.$disconnect();
  });

  it("creates one company and one invited owner across repeated approvals", async () => {
    const initialApplication = await prisma.dealerApplication.findUniqueOrThrow({ where: { id: applicationId } });
    const firstState = await reviewDealerApplication(approvalForm(initialApplication.updatedAt));

    expect(firstState.ok).toBe(true);

    const approvedApplication = await prisma.dealerApplication.findUniqueOrThrow({ where: { id: applicationId } });
    const secondState = await reviewDealerApplication(approvalForm(approvedApplication.updatedAt));

    expect(secondState.ok).toBe(true);
    expect(
      await prisma.company.count({ where: { id: `dealer-company-${applicationId}` } }),
    ).toBe(1);
    expect(await prisma.user.count({ where: { email } })).toBe(1);

    const dealerOwner = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(dealerOwner).toEqual(
      expect.objectContaining({
        role: "DEALER_OWNER",
        status: "INVITED",
        companyId: `dealer-company-${applicationId}`,
        passwordHash: null,
      }),
    );
    expect(approvedApplication.companyId).toBe(`dealer-company-${applicationId}`);
  });
});
