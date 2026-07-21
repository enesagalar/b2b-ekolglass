import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requirePermissionUser: mocks.requirePermissionUser }));

import { prisma } from "@/lib/prisma";
import { importProductsCsvAction } from "./import-actions";

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-6);
const actorId = `catalog-import-actor-${suffix}`;
const categoryId = `catalog-import-category-${suffix}`;
const existingCode = `E${suffix}`;
const newCode = `R${suffix}`;

function importForm() {
  const csv = [
    "Ekol Kod,Stok Adı,Açıklama,Mod. Yıl,En-Boy,S/S,mm,Özellik,Delik,Çrçv / Oyk,Beyaz,Yeşil,Füme,GALAXY",
    "OTOMOBİL - PANELVAN - MİNÜBÜS GRUBU,,,,,,,,,,,,,",
    `TEST MARKA,,,,,,,,,,,,,`,
    `${existingCode},Güncel Mevcut Ürün,ÖN CAM,20-26,500 * 800,S/S,4,,,,,X,,`,
    `${newCode},Yeni Aktarım Ürünü,ARKA CAM,20-26,600 * 900,S/S,4,,,,X,,,`,
  ].join("\n");
  const form = new FormData();
  form.set("file", new File([csv], "urunler.csv", { type: "text/csv" }));
  return form;
}

describe("product CSV import transaction", () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: { id: actorId, email: `${actorId}@example.com`, name: "Catalog Import Test", role: "ADMIN", status: "ACTIVE" },
    });
    await prisma.productCategory.create({
      data: { id: categoryId, slug: `catalog-import-${suffix}`, name: "Eski Kategori" },
    });
    await prisma.product.create({
      data: {
        code: existingCode,
        name: "Eski Ürün Adı",
        categoryId,
        glassType: "Temperli",
        status: "DRAFT",
      },
    });
    mocks.requirePermissionUser.mockResolvedValue({ id: actorId });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.product.deleteMany({ where: { code: { in: [existingCode, newCode] } } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
  });

  it("rolls back category, product, stock and audit writes when audit persistence fails", async () => {
    const triggerName = `catalog_import_rollback_${suffix}`;
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerName}"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW."action" = 'product.csv.import'
      BEGIN
        SELECT RAISE(ABORT, 'forced catalog import audit failure');
      END
    `);

    try {
      const state = await importProductsCsvAction({ ok: false }, importForm());

      expect(state).toEqual({
        ok: false,
        message: "CSV aktarımı tamamlanamadı. Hiçbir katalog kaydı değiştirilmedi.",
      });
      expect(await prisma.product.findUnique({ where: { code: newCode } })).toBeNull();
      expect(await prisma.stockItem.count({ where: { product: { code: newCode } } })).toBe(0);
      expect(await prisma.product.findUniqueOrThrow({ where: { code: existingCode } })).toMatchObject({
        name: "Eski Ürün Adı",
        categoryId,
      });
      expect(await prisma.auditLog.count({ where: { actorUserId: actorId, action: "product.csv.import" } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}"`);
    }
  });

  it("keeps a committed import successful when cache revalidation fails", async () => {
    mocks.revalidatePath.mockImplementationOnce(() => {
      throw new Error("cache unavailable");
    });

    const state = await importProductsCsvAction({ ok: false }, importForm());

    expect(state).toMatchObject({ ok: true, created: 1, updated: 1 });
    expect(await prisma.product.findUniqueOrThrow({ where: { code: newCode } })).toMatchObject({
      status: "DRAFT",
      orderMode: "ORDER_ONLY",
    });
    expect(await prisma.stockItem.count({ where: { product: { code: newCode }, warehouseCode: "MERKEZ" } })).toBe(1);
  });
});
