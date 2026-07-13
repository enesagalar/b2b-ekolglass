import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { compare } from "bcryptjs";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requirePermissionUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => ({ get: vi.fn(() => null) })) }));
vi.mock("@/lib/auth", () => ({ requirePermissionUser: mocks.requirePermissionUser }));

import { resetDealerPassword } from "@/features/auth/password-reset-actions";
import {
  changeDealerUserStatus,
  createDealerUser,
  createPasswordResetInvitation,
} from "@/features/company-management/actions";
import { hashActivationToken } from "@/lib/activation-token";
import { prisma } from "@/lib/prisma";
import { hashPasswordResetToken } from "@/lib/password-reset-token";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const prefix = `lifecycle-${suffix}`;
const approvedCompanyId = `${prefix}-approved-a`;
const otherCompanyId = `${prefix}-approved-b`;
const pendingCompanyId = `${prefix}-pending`;

const userIds = {
  scoped: `${prefix}-scoped-user`,
  suspension: `${prefix}-suspension-user`,
  noPassword: `${prefix}-no-password-user`,
  pendingCompany: `${prefix}-pending-company-user`,
  reactivation: `${prefix}-reactivation-user`,
  resetA: `${prefix}-reset-a-user`,
  resetB: `${prefix}-reset-b-user`,
};

const future = () => new Date(Date.now() + 60 * 60 * 1000);

function statusForm(companyId: string, userId: string, targetStatus: string) {
  const formData = new FormData();
  formData.set("companyId", companyId);
  formData.set("userId", userId);
  formData.set("targetStatus", targetStatus);
  return formData;
}

function resetInvitationForm(userId: string) {
  const formData = new FormData();
  formData.set("userId", userId);
  return formData;
}

function rawTokenFrom(path: string) {
  return path.split("/").at(-1)!;
}

describe("dealer-user lifecycle with SQLite", () => {
  beforeAll(async () => {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"] } },
      select: { id: true },
    });
    if (!admin) throw new Error("Integration test requires a seeded admin user.");

    mocks.requirePermissionUser.mockResolvedValue({ id: admin.id });

    await prisma.company.createMany({
      data: [
        {
          id: approvedCompanyId,
          legalName: "Lifecycle Approved A Ltd.",
          displayName: "Lifecycle Approved A",
          email: `${prefix}-company-a@example.com`,
          phone: "+90 212 100 00 01",
          city: "Istanbul",
          status: "APPROVED",
        },
        {
          id: otherCompanyId,
          legalName: "Lifecycle Approved B Ltd.",
          displayName: "Lifecycle Approved B",
          email: `${prefix}-company-b@example.com`,
          phone: "+90 212 100 00 02",
          city: "Istanbul",
          status: "APPROVED",
        },
        {
          id: pendingCompanyId,
          legalName: "Lifecycle Pending Ltd.",
          displayName: "Lifecycle Pending",
          email: `${prefix}-company-pending@example.com`,
          phone: "+90 212 100 00 03",
          city: "Istanbul",
          status: "PENDING",
        },
      ],
    });

    await prisma.user.createMany({
      data: [
        { id: userIds.scoped, email: `${prefix}-scoped@example.com`, name: "Scoped User", role: "DEALER_STAFF", status: "ACTIVE", passwordHash: "existing-hash", companyId: approvedCompanyId },
        { id: userIds.suspension, email: `${prefix}-suspension@example.com`, name: "Suspension User", role: "DEALER_STAFF", status: "ACTIVE", passwordHash: "existing-hash", companyId: approvedCompanyId },
        { id: userIds.noPassword, email: `${prefix}-no-password@example.com`, name: "No Password User", role: "DEALER_STAFF", status: "SUSPENDED", passwordHash: null, companyId: approvedCompanyId },
        { id: userIds.pendingCompany, email: `${prefix}-pending@example.com`, name: "Pending Company User", role: "DEALER_STAFF", status: "SUSPENDED", passwordHash: "existing-hash", companyId: pendingCompanyId },
        { id: userIds.reactivation, email: `${prefix}-reactivation@example.com`, name: "Reactivation User", role: "DEALER_OWNER", status: "SUSPENDED", passwordHash: "existing-hash", companyId: approvedCompanyId },
        { id: userIds.resetA, email: `${prefix}-reset-a@example.com`, name: "Reset User A", role: "DEALER_OWNER", status: "ACTIVE", passwordHash: "old-hash-a", companyId: approvedCompanyId },
        { id: userIds.resetB, email: `${prefix}-reset-b@example.com`, name: "Reset User B", role: "DEALER_STAFF", status: "ACTIVE", passwordHash: "old-hash-b", companyId: otherCompanyId },
      ],
    });
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: suffix } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);

    if (ids.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { OR: [{ entityId: { in: ids } }, { actorUserId: { in: ids } }] },
      });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.company.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  it("creates an invited dealer user only under the requested approved company", async () => {
    const formData = new FormData();
    formData.set("companyId", approvedCompanyId);
    formData.set("name", "New Lifecycle User");
    formData.set("email", `${prefix}-NEW-USER@EXAMPLE.COM`);
    formData.set("role", "DEALER_STAFF");

    const state = await createDealerUser({ ok: false, message: "" }, formData);

    expect(state.ok).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: `${prefix}-new-user@example.com` },
    });
    expect(user).toEqual(expect.objectContaining({
      companyId: approvedCompanyId,
      name: "New Lifecycle User",
      role: "DEALER_STAFF",
      status: "INVITED",
      passwordHash: null,
    }));
  });

  it("does not mutate a user when the submitted company and user do not match", async () => {
    await expect(
      changeDealerUserStatus(statusForm(otherCompanyId, userIds.scoped, "SUSPENDED")),
    ).rejects.toThrow();

    expect(await prisma.user.findUniqueOrThrow({ where: { id: userIds.scoped } })).toEqual(
      expect.objectContaining({ companyId: approvedCompanyId, status: "ACTIVE" }),
    );
  });

  it("revokes sessions and outstanding credential tokens when suspending a user", async () => {
    const activationHash = hashActivationToken(`${prefix}-activation-token`);
    const resetHash = hashPasswordResetToken(`${prefix}-suspension-reset-token`);
    await prisma.authSession.create({
      data: { userId: userIds.suspension, tokenHash: hashActivationToken(`${prefix}-session`), expiresAt: future() },
    });
    await prisma.userActivationToken.create({
      data: { userId: userIds.suspension, tokenHash: activationHash, expiresAt: future() },
    });
    await prisma.userPasswordResetToken.create({
      data: { userId: userIds.suspension, tokenHash: resetHash, expiresAt: future() },
    });

    await changeDealerUserStatus(statusForm(approvedCompanyId, userIds.suspension, "SUSPENDED"));

    expect((await prisma.user.findUniqueOrThrow({ where: { id: userIds.suspension } })).status).toBe("SUSPENDED");
    expect(await prisma.authSession.count({ where: { userId: userIds.suspension } })).toBe(0);
    expect((await prisma.userActivationToken.findUniqueOrThrow({ where: { tokenHash: activationHash } })).revokedAt).toBeInstanceOf(Date);
    expect((await prisma.userPasswordResetToken.findUniqueOrThrow({ where: { tokenHash: resetHash } })).revokedAt).toBeInstanceOf(Date);
  });

  it("reactivates only suspended users with passwords under approved companies", async () => {
    await expect(
      changeDealerUserStatus(statusForm(approvedCompanyId, userIds.noPassword, "ACTIVE")),
    ).rejects.toThrow();
    await expect(
      changeDealerUserStatus(statusForm(pendingCompanyId, userIds.pendingCompany, "ACTIVE")),
    ).rejects.toThrow();

    await changeDealerUserStatus(statusForm(approvedCompanyId, userIds.reactivation, "ACTIVE"));

    expect((await prisma.user.findUniqueOrThrow({ where: { id: userIds.noPassword } })).status).toBe("SUSPENDED");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userIds.pendingCompany } })).status).toBe("SUSPENDED");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userIds.reactivation } })).status).toBe("ACTIVE");
  });

  it("scopes reset invitations to one user and consumes a reset once while revoking that user's sessions", async () => {
    const firstA = await createPasswordResetInvitation({ ok: false, message: "" }, resetInvitationForm(userIds.resetA));
    const firstB = await createPasswordResetInvitation({ ok: false, message: "" }, resetInvitationForm(userIds.resetB));
    const secondA = await createPasswordResetInvitation({ ok: false, message: "" }, resetInvitationForm(userIds.resetA));
    expect(firstA.ok && firstB.ok && secondA.ok).toBe(true);

    const firstAHash = hashPasswordResetToken(rawTokenFrom(firstA.resetPath!));
    const firstBHash = hashPasswordResetToken(rawTokenFrom(firstB.resetPath!));
    const secondARaw = rawTokenFrom(secondA.resetPath!);
    const secondAHash = hashPasswordResetToken(secondARaw);

    expect((await prisma.userPasswordResetToken.findUniqueOrThrow({ where: { tokenHash: firstAHash } })).revokedAt).toBeInstanceOf(Date);
    expect((await prisma.userPasswordResetToken.findUniqueOrThrow({ where: { tokenHash: firstBHash } })).revokedAt).toBeNull();

    await prisma.authSession.createMany({
      data: [
        { userId: userIds.resetA, tokenHash: hashActivationToken(`${prefix}-reset-a-session`), expiresAt: future() },
        { userId: userIds.resetB, tokenHash: hashActivationToken(`${prefix}-reset-b-session`), expiresAt: future() },
      ],
    });

    const resetForm = new FormData();
    resetForm.set("token", secondARaw);
    resetForm.set("password", "NewDealer2026Pass");
    resetForm.set("passwordConfirm", "NewDealer2026Pass");

    const resetState = await resetDealerPassword({ ok: false, message: "" }, resetForm);

    expect(resetState).toEqual(expect.objectContaining({ ok: true, completed: true }));
    const resetUser = await prisma.user.findUniqueOrThrow({ where: { id: userIds.resetA } });
    expect(await compare("NewDealer2026Pass", resetUser.passwordHash!)).toBe(true);
    expect((await prisma.userPasswordResetToken.findUniqueOrThrow({ where: { tokenHash: secondAHash } })).consumedAt).toBeInstanceOf(Date);
    expect(await prisma.authSession.count({ where: { userId: userIds.resetA } })).toBe(0);
    expect(await prisma.authSession.count({ where: { userId: userIds.resetB } })).toBe(1);
    expect((await prisma.userPasswordResetToken.findUniqueOrThrow({ where: { tokenHash: firstBHash } })).revokedAt).toBeNull();

    const replayState = await resetDealerPassword({ ok: false, message: "" }, resetForm);
    expect(replayState.ok).toBe(false);
  });
});
