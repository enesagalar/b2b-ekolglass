import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requirePermissionUser: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error(url), { digest: "NEXT_REDIRECT" });
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ requirePermissionUser: mocks.requirePermissionUser }));

import { prisma } from "@/lib/prisma";
import { applyPriceStockImportBatch, createPriceStockImportBatch } from "./price-stock-import-actions";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const actorId = `import-actor-${suffix}`;
const categoryId = `import-category-${suffix}`;
const productId = `import-product-${suffix}`;
const priceListId = `import-price-list-${suffix}`;
const productCode = `E${String(Date.now() % 1_000_000).padStart(6, "0")}`;
let batchId = "";

describe("price/stock import with SQLite", () => {
  beforeAll(async () => {
    await prisma.user.create({ data: { id: actorId, email: `${suffix}@example.com`, name: "Import Test", role: "ADMIN", status: "ACTIVE" } });
    await prisma.productCategory.create({ data: { id: categoryId, slug: `import-${suffix}`, name: "Import Test" } });
    await prisma.product.create({ data: { id: productId, code: productCode, name: "Import Product", categoryId, glassType: "Temperli", status: "DRAFT" } });
    await prisma.priceList.create({ data: { id: priceListId, name: "Import Standard", currency: "TRY", isActive: true } });
    await prisma.stockItem.create({ data: { productId, warehouseCode: "MERKEZ", quantity: 4, reservedQuantity: 2, visibility: "SIMPLIFIED", status: "IN_STOCK" } });
    mocks.requirePermissionUser.mockResolvedValue({ id: actorId });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.catalogImportBatch.deleteMany({ where: { createdById: actorId } });
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    await prisma.priceList.delete({ where: { id: priceListId } }).catch(() => undefined);
    await prisma.productCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: actorId } }).catch(() => undefined);
  });

  it("stages and atomically applies standard price and physical stock", async () => {
    const form = new FormData();
    form.set("priceListId", priceListId);
    form.set("file", new File([
      `\uFEFFurun_kodu,net_bayi_fiyati,stok_miktari,depo_kodu,stok_gorunurlugu\n${productCode},875.50,9,MERKEZ,DETAYLI`,
    ], "fiyat-stok.csv", { type: "text/csv" }));

    await expect(createPriceStockImportBatch(form)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
    const batch = await prisma.catalogImportBatch.findFirstOrThrow({ where: { createdById: actorId }, include: { rows: true } });
    batchId = batch.id;
    expect(batch).toMatchObject({ totalRows: 1, validRows: 1, invalidRows: 0, status: "PREVIEW" });
    expect(batch.rows[0]).toMatchObject({ productId, stockQuantity: 9, stockVisibility: "DETAILED", status: "VALID" });

    await expect(applyPriceStockImportBatch(batch.id)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
    const [applied, price, stock] = await Promise.all([
      prisma.catalogImportBatch.findUniqueOrThrow({ where: { id: batch.id } }),
      prisma.productPrice.findUniqueOrThrow({ where: { productId_priceListId_minQuantity: { productId, priceListId, minQuantity: 1 } } }),
      prisma.stockItem.findUniqueOrThrow({ where: { productId_warehouseCode: { productId, warehouseCode: "MERKEZ" } } }),
    ]);
    expect(applied.status).toBe("APPLIED");
    expect(price.amount.toString()).toBe("875.5");
    expect(stock).toMatchObject({ quantity: 9, reservedQuantity: 2, visibility: "DETAILED" });
    expect(await prisma.stockMovement.findFirstOrThrow({
      where: { sourceType: "CATALOG_IMPORT_BATCH", sourceId: batch.id, stockItemId: stock.id },
    })).toMatchObject({
      movementType: "CSV_IMPORT",
      physicalDelta: 5,
      reservedDelta: 0,
      beforeQuantity: 4,
      afterQuantity: 9,
      beforeReservedQuantity: 2,
      afterReservedQuantity: 2,
    });
    expect(batchId).toBe(batch.id);
  });
});
