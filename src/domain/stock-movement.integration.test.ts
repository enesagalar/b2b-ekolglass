import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { recordStockMovement } from "./stock-movement";

const suffix = randomUUID();
const ids = {
  category: `movement-category-${suffix}`,
  product: `movement-product-${suffix}`,
  stock: `movement-stock-${suffix}`,
};

describe("append-only stock movement ledger", () => {
  beforeAll(async () => {
    await prisma.productCategory.create({
      data: { id: ids.category, slug: `movement-${suffix}`, name: "Movement Test" },
    });
    await prisma.product.create({
      data: {
        id: ids.product,
        code: `MOV-${suffix}`,
        name: "Movement Test Product",
        categoryId: ids.category,
        glassType: "Lamine",
        status: "ACTIVE",
      },
    });
    await prisma.stockItem.create({
      data: {
        id: ids.stock,
        productId: ids.product,
        warehouseCode: "MERKEZ",
        quantity: 10,
        reservedQuantity: 0,
        status: "IN_STOCK",
      },
    });
    await prisma.$transaction((tx) => recordStockMovement(tx, {
      stockItemId: ids.stock,
      productId: ids.product,
      productCode: `MOV-${suffix}`,
      warehouseCode: "MERKEZ",
      movementType: "OPENING_BALANCE",
      before: { quantity: 0, reservedQuantity: 0 },
      after: { quantity: 10, reservedQuantity: 0 },
      reason: "Entegrasyon testi acilis bakiyesi.",
      sourceType: "TEST_FIXTURE",
      sourceId: ids.stock,
      idempotencyKey: `movement-opening:${ids.stock}`,
    }));
  });

  afterAll(async () => {
    await prisma.stockItem.deleteMany({ where: { id: ids.stock } });
    await prisma.product.deleteMany({ where: { id: ids.product } });
    await prisma.productCategory.deleteMany({ where: { id: ids.category } });
  });

  it("rolls back the balance when movement persistence fails", async () => {
    await expect(prisma.$transaction(async (tx) => {
      const before = await tx.stockItem.findUniqueOrThrow({ where: { id: ids.stock } });
      const after = await tx.stockItem.update({ where: { id: ids.stock }, data: { quantity: 11 } });
      await recordStockMovement(tx, {
        stockItemId: ids.stock,
        productId: ids.product,
        productCode: `MOV-${suffix}`,
        warehouseCode: "MERKEZ",
        movementType: "MANUAL_ADJUSTMENT",
        before: { quantity: before.quantity, reservedQuantity: before.reservedQuantity },
        after: { quantity: after.quantity, reservedQuantity: after.reservedQuantity },
        reason: "Rollback davranisini dogrulayan stok duzeltmesi.",
        sourceType: "ROLLBACK_TEST",
        sourceId: suffix,
        idempotencyKey: `movement-rollback:${suffix}`,
      });
      throw new Error("FORCED_ROLLBACK");
    })).rejects.toThrow("FORCED_ROLLBACK");

    expect(await prisma.stockItem.findUniqueOrThrow({ where: { id: ids.stock } })).toMatchObject({ quantity: 10 });
    expect(await prisma.stockMovement.count({ where: { sourceType: "ROLLBACK_TEST", sourceId: suffix } })).toBe(0);
  });

  it("rejects a duplicate idempotency key without a second stock effect", async () => {
    const idempotencyKey = `movement-idempotency:${suffix}`;
    await prisma.$transaction(async (tx) => {
      const before = await tx.stockItem.findUniqueOrThrow({ where: { id: ids.stock } });
      const after = await tx.stockItem.update({ where: { id: ids.stock }, data: { quantity: 12 } });
      await recordStockMovement(tx, {
        stockItemId: ids.stock,
        productId: ids.product,
        productCode: `MOV-${suffix}`,
        warehouseCode: "MERKEZ",
        movementType: "MANUAL_ADJUSTMENT",
        before: { quantity: before.quantity, reservedQuantity: before.reservedQuantity },
        after: { quantity: after.quantity, reservedQuantity: after.reservedQuantity },
        reason: "Idempotency davranisini dogrulayan stok duzeltmesi.",
        sourceType: "IDEMPOTENCY_TEST",
        sourceId: suffix,
        idempotencyKey,
      });
    });

    await expect(prisma.$transaction(async (tx) => {
      const before = await tx.stockItem.findUniqueOrThrow({ where: { id: ids.stock } });
      const after = await tx.stockItem.update({ where: { id: ids.stock }, data: { quantity: 13 } });
      await recordStockMovement(tx, {
        stockItemId: ids.stock,
        productId: ids.product,
        productCode: `MOV-${suffix}`,
        warehouseCode: "MERKEZ",
        movementType: "MANUAL_ADJUSTMENT",
        before: { quantity: before.quantity, reservedQuantity: before.reservedQuantity },
        after: { quantity: after.quantity, reservedQuantity: after.reservedQuantity },
        reason: "Ayni idempotency anahtarini tekrar kullanma denemesi.",
        sourceType: "IDEMPOTENCY_TEST",
        sourceId: suffix,
        idempotencyKey,
      });
    })).rejects.toThrow();

    expect(await prisma.stockItem.findUniqueOrThrow({ where: { id: ids.stock } })).toMatchObject({ quantity: 12 });
    expect(await prisma.stockMovement.count({ where: { idempotencyKey } })).toBe(1);
  });

  it("blocks updates and deletes at the database boundary", async () => {
    const movement = await prisma.stockMovement.findFirstOrThrow({ where: { stockItemId: ids.stock } });
    const before = { reason: movement.reason, count: await prisma.stockMovement.count({ where: { stockItemId: ids.stock } }) };
    await expect(prisma.stockMovement.update({
      where: { id: movement.id },
      data: { reason: "Degistirilemez" },
    })).rejects.toThrow();
    await expect(prisma.stockMovement.delete({ where: { id: movement.id } })).rejects.toThrow();
    expect(await prisma.stockMovement.findUniqueOrThrow({ where: { id: movement.id } })).toMatchObject({ reason: before.reason });
    expect(await prisma.stockMovement.count({ where: { stockItemId: ids.stock } })).toBe(before.count);
  });
});
