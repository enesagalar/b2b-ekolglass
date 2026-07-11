import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { compare } from "bcryptjs";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requirePermissionUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: vi.fn(() => null) })),
}));
vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));

import { activateInvitedAccount } from "@/features/auth/activation-actions";
import { createActivationInvitation } from "@/features/company-management/actions";
import { hashActivationToken } from "@/lib/activation-token";
import { prisma } from "@/lib/prisma";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const companyId = `activation-company-${suffix}`;
const userId = `activation-user-${suffix}`;
const email = `activation-${suffix}@example.com`;
let tokenFingerprint = "";

describe("dealer activation flow with SQLite", () => {
  beforeAll(async () => {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"] } },
      select: { id: true },
    });
    if (!admin) throw new Error("Integration test requires a seeded admin user.");

    mocks.requirePermissionUser.mockResolvedValue({ id: admin.id });

    await prisma.company.create({
      data: {
        id: companyId,
        legalName: "Activation Test Cam Ltd.",
        displayName: "Activation Test Cam",
        email,
        phone: "+90 212 000 11 22",
        city: "İstanbul",
        status: "APPROVED",
      },
    });
    await prisma.user.create({
      data: {
        id: userId,
        email,
        name: "Activation Yetkili",
        role: "DEALER_OWNER",
        status: "INVITED",
        companyId,
        passwordHash: null,
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityType: "User", entityId: userId },
          ...(tokenFingerprint ? [{ metadata: { contains: tokenFingerprint } }] : []),
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  it("stores only a hash and consumes the invitation once", async () => {
    const invitationForm = new FormData();
    invitationForm.set("userId", userId);
    const invitationState = await createActivationInvitation(invitationForm);

    expect(invitationState.ok).toBe(true);
    expect(invitationState.activationPath).toMatch(/^\/aktivasyon\/[A-Za-z0-9_-]{43}$/);

    const rawToken = invitationState.activationPath!.split("/").at(-1)!;
    const tokenHash = hashActivationToken(rawToken);
    tokenFingerprint = tokenHash.slice(0, 16);
    const storedToken = await prisma.userActivationToken.findUniqueOrThrow({ where: { tokenHash } });
    expect(storedToken.tokenHash).toBe(tokenHash);
    expect(storedToken.tokenHash).not.toContain(rawToken);

    const activationForm = new FormData();
    activationForm.set("token", rawToken);
    activationForm.set("password", "EkolGlass2026Secure");
    activationForm.set("passwordConfirm", "EkolGlass2026Secure");
    const activationState = await activateInvitedAccount({ ok: false, message: "" }, activationForm);

    expect(activationState).toEqual(expect.objectContaining({ ok: true, activated: true }));
    const activeUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(activeUser.status).toBe("ACTIVE");
    expect(activeUser.passwordHash).toBeTruthy();
    expect(await compare("EkolGlass2026Secure", activeUser.passwordHash!)).toBe(true);
    expect((await prisma.userActivationToken.findUniqueOrThrow({ where: { tokenHash } })).consumedAt).toBeInstanceOf(Date);

    const replayState = await activateInvitedAccount({ ok: false, message: "" }, activationForm);
    expect(replayState.ok).toBe(false);
    expect(replayState.message).toContain("geçersiz");
  });
});
