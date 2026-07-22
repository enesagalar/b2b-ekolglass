import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requirePermissionUser: mocks.requirePermissionUser }));

import { prisma } from "@/lib/prisma";
import { updateSiteSetting } from "./actions";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const actorId = `cms-integrity-${suffix}`;
const key = "homepage.hero.cta";
const triggerName = `cms_audit_failure_${Date.now()}`;
let original: { value: string; isEditable: boolean; group: string; valueType: string };

async function settingForm(value: string, expectedUpdatedAt?: Date) {
  const current = await prisma.siteSetting.findUniqueOrThrow({ where: { key } });
  const formData = new FormData();
  formData.set("key", key);
  formData.set("value", value);
  formData.set("expectedUpdatedAt", (expectedUpdatedAt ?? current.updatedAt).toISOString());
  return formData;
}

describe("site setting mutation integrity with SQLite", () => {
  beforeAll(async () => {
    const setting = await prisma.siteSetting.findUniqueOrThrow({ where: { key } });
    original = {
      value: setting.value,
      isEditable: setting.isEditable,
      group: setting.group,
      valueType: setting.valueType,
    };
    await prisma.user.create({
      data: { id: actorId, email: `${actorId}@example.com`, name: "CMS Integrity", role: "ADMIN", status: "ACTIVE" },
    });
    mocks.requirePermissionUser.mockResolvedValue({ id: actorId, role: "ADMIN" });
  });

  afterEach(async () => {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}"`);
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.siteSetting.update({
      where: { key },
      data: original,
    });
    mocks.revalidatePath.mockClear();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
  });

  it("rejects keys outside the fixed CMS allowlist without creating records", async () => {
    const formData = new FormData();
    formData.set("key", `homepage.injected.${suffix}`);
    formData.set("value", "Injected");
    formData.set("expectedUpdatedAt", new Date().toISOString());

    const state = await updateSiteSetting({ ok: false, message: "" }, formData);

    expect(state.ok).toBe(false);
    expect(await prisma.siteSetting.count({ where: { key: `homepage.injected.${suffix}` } })).toBe(0);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("enforces isEditable inside the action", async () => {
    await prisma.siteSetting.update({ where: { key }, data: { isEditable: false } });
    const state = await updateSiteSetting({ ok: false, message: "" }, await settingForm("Kilitli alan"));

    expect(state).toMatchObject({ ok: false, message: "Bu içerik alanı düzenlenemez." });
    expect((await prisma.siteSetting.findUniqueOrThrow({ where: { key } })).value).toBe(original.value);
  });

  it("rejects stale forms without mutation or audit", async () => {
    const staleVersion = (await prisma.siteSetting.findUniqueOrThrow({ where: { key } })).updatedAt;
    await prisma.siteSetting.update({ where: { key }, data: { value: "Daha yeni değer" } });

    const state = await updateSiteSetting(
      { ok: false, message: "" },
      await settingForm("Eski form değeri", staleVersion),
    );

    expect(state.ok).toBe(false);
    expect(state.message).toContain("Sayfayı yenileyin");
    expect((await prisma.siteSetting.findUniqueOrThrow({ where: { key } })).value).toBe("Daha yeni değer");
    expect(await prisma.auditLog.count({ where: { actorUserId: actorId } })).toBe(0);
  });

  it("writes the setting and complete audit evidence in one transaction", async () => {
    const state = await updateSiteSetting({ ok: false, message: "" }, await settingForm("Kataloğa Git"));

    expect(state).toEqual({ ok: true, message: "İçerik alanı kaydedildi." });
    expect((await prisma.siteSetting.findUniqueOrThrow({ where: { key } })).value).toBe("Kataloğa Git");
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { actorUserId: actorId, action: "site_setting.update" } });
    expect(JSON.parse(audit.metadata ?? "{}")).toMatchObject({
      key,
      previousValue: original.value,
      value: "Kataloğa Git",
      correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/icerik");
  });

  it("rolls the CMS update back and sanitizes an audit persistence failure", async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerName}"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW."action" = 'site_setting.update'
      BEGIN
        SELECT RAISE(ABORT, 'secret cms audit failure');
      END
    `);

    const state = await updateSiteSetting({ ok: false, message: "" }, await settingForm("Rollback CTA"));

    expect(state.ok).toBe(false);
    expect(state.message).toMatch(/Destek kodu: [0-9a-f-]{36}$/);
    expect(state.message).not.toContain("secret cms audit failure");
    expect((await prisma.siteSetting.findUniqueOrThrow({ where: { key } })).value).toBe(original.value);
    expect(await prisma.auditLog.count({ where: { actorUserId: actorId } })).toBe(0);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not create audit noise for an unchanged value", async () => {
    const state = await updateSiteSetting({ ok: false, message: "" }, await settingForm(original.value));

    expect(state).toEqual({ ok: true, message: "Değişiklik bulunamadı." });
    expect(await prisma.auditLog.count({ where: { actorUserId: actorId } })).toBe(0);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
