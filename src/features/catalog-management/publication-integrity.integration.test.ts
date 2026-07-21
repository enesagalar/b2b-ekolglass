import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requirePermissionUser: mocks.requirePermissionUser }));

import { prisma } from "@/lib/prisma";
import { setProductPublicationStatus } from "./actions";
import { publishReadyProducts } from "./publication-actions";

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-6);
const actorId = `publication-actor-${suffix}`;
const categoryId = `publication-category-${suffix}`;
const priceListId = `publication-price-list-${suffix}`;
const productIds = [`publication-product-a-${suffix}`, `publication-product-b-${suffix}`];

function statusForm(productId: string, targetStatus = "ACTIVE") {
  const form = new FormData();
  form.set("productId", productId);
  form.set("targetStatus", targetStatus);
  return form;
}

function bulkForm(...ids: string[]) {
  const form = new FormData();
  ids.forEach((id) => form.append("productIds", id));
  return form;
}

describe("product publication integrity with SQLite", () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: { id: actorId, email: `${actorId}@example.com`, name: "Publication Test", role: "ADMIN", status: "ACTIVE" },
    });
    await prisma.productCategory.create({ data: { id: categoryId, slug: `publication-${suffix}`, name: "Publication Test" } });
    await prisma.priceList.create({ data: { id: priceListId, name: `Standart ${suffix}`, currency: "TRY", isActive: true } });
    await prisma.product.createMany({
      data: productIds.map((id, index) => ({
        id,
        code: `${index ? "R" : "E"}${suffix}`,
        name: `Publication Product ${index}`,
        categoryId,
        glassType: "Temperli",
        status: "DRAFT",
      })),
    });
    await prisma.productPrice.createMany({
      data: productIds.map((productId) => ({ productId, priceListId, minQuantity: 1, amount: 100 })),
    });
    await prisma.stockItem.createMany({
      data: productIds.map((productId) => ({
        productId,
        warehouseCode: "MERKEZ",
        quantity: 5,
        reservedQuantity: 0,
        status: "IN_STOCK",
      })),
    });
    mocks.requirePermissionUser.mockResolvedValue({ id: actorId });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.priceList.deleteMany({ where: { id: priceListId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
  });

  it("reads the current price inside the single-product transaction and rejects stale readiness", async () => {
    await prisma.productPrice.update({
      where: { productId_priceListId_minQuantity: { productId: productIds[0], priceListId, minQuantity: 1 } },
      data: { minQuantity: 10 },
    });

    const state = await setProductPublicationStatus(statusForm(productIds[0]));

    expect(state.ok).toBe(false);
    expect(state.message).toContain("1 adet");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productIds[0] } })).status).toBe("DRAFT");
    await prisma.productPrice.update({
      where: { productId_priceListId_minQuantity: { productId: productIds[0], priceListId, minQuantity: 10 } },
      data: { minQuantity: 1 },
    });
  });

  it("reads current reservations inside the transaction and rejects stale stock readiness", async () => {
    await prisma.stockItem.update({
      where: { productId_warehouseCode: { productId: productIds[0], warehouseCode: "MERKEZ" } },
      data: { reservedQuantity: 5 },
    });

    const state = await setProductPublicationStatus(statusForm(productIds[0]));

    expect(state.ok).toBe(false);
    expect(state.message).toContain("kullanılabilir stok");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productIds[0] } })).status).toBe("DRAFT");
    await prisma.stockItem.update({
      where: { productId_warehouseCode: { productId: productIds[0], warehouseCode: "MERKEZ" } },
      data: { reservedQuantity: 0 },
    });
  });

  it("rolls back every product status when bulk publication audit persistence fails", async () => {
    const triggerName = `publication_rollback_${suffix}`;
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerName}"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW."action" = 'product.published'
      BEGIN
        SELECT RAISE(ABORT, 'forced publication audit failure');
      END
    `);

    try {
      const state = await publishReadyProducts({ ok: false, message: "" }, bulkForm(...productIds));

      expect(state).toEqual({ ok: false, message: "Toplu yayın işlemi tamamlanamadı." });
      expect(await prisma.product.count({ where: { id: { in: productIds }, status: "DRAFT" } })).toBe(2);
      expect(await prisma.auditLog.count({ where: { actorUserId: actorId, action: "product.published" } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}"`);
    }
  });
});
