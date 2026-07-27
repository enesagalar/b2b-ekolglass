import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  revalidatePathsBestEffort: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));
vi.mock("@/lib/cache-revalidation", () => ({
  revalidatePathsBestEffort: mocks.revalidatePathsBestEffort,
}));

import { recordStockMovement } from "@/domain/stock-movement";
import { prisma } from "@/lib/prisma";

import {
  cancelStockCount,
  completeStockCount,
  openStockCount,
} from "./actions";

const suffix = randomUUID().replaceAll("-", "");
const actorId = `count-actor-${suffix}`;
const categoryId = `count-category-${suffix}`;
const warehouseCode = `C${suffix.slice(0, 12).toUpperCase()}`;

function openingForm(stockItemId: string, idempotencyKey = randomUUID()) {
  const data = new FormData();
  data.set("stockItemId", stockItemId);
  data.set("idempotencyKey", idempotencyKey);
  return data;
}

function completionForm(
  sessionId: string,
  countedQuantity: number,
  idempotencyKey = randomUUID(),
  reason = "Raf ve paletlerin tamamı fiziksel olarak sayıldı.",
) {
  const data = new FormData();
  data.set("sessionId", sessionId);
  data.set("countedQuantity", String(countedQuantity));
  data.set("reason", reason);
  data.set("idempotencyKey", idempotencyKey);
  data.set("confirmed", "on");
  return data;
}

function cancellationForm(
  sessionId: string,
  idempotencyKey = randomUUID(),
) {
  const data = new FormData();
  data.set("sessionId", sessionId);
  data.set("reason", "Yanlış raf seçildiği için sayım iptal edildi.");
  data.set("idempotencyKey", idempotencyKey);
  return data;
}

async function createCountStock(
  label: string,
  quantity: number,
  reservedQuantity = 0,
) {
  const productId = `count-product-${label}-${suffix}`;
  const productCode = `SC-${label}-${suffix.slice(0, 6)}`.toUpperCase();
  const stockItemId = `count-stock-${label}-${suffix}`;
  await prisma.product.create({
    data: {
      id: productId,
      code: productCode,
      name: `Sayım ${label} ürünü`,
      categoryId,
      glassType: "Lamine",
    },
  });
  await prisma.stockItem.create({
    data: {
      id: stockItemId,
      productId,
      warehouseCode,
      quantity,
      reservedQuantity,
      status: quantity > reservedQuantity ? "IN_STOCK" : "OUT_OF_STOCK",
    },
  });
  if (quantity || reservedQuantity) {
    await prisma.$transaction((tx) =>
      recordStockMovement(tx, {
        stockItemId,
        productId,
        productCode,
        warehouseCode,
        movementType: "OPENING_BALANCE",
        before: { quantity: 0, reservedQuantity: 0 },
        after: { quantity, reservedQuantity },
        reason: "Sayım entegrasyon testi açılış bakiyesi.",
        sourceType: "TEST_FIXTURE",
        sourceId: stockItemId,
        idempotencyKey: `count-fixture:${stockItemId}`,
      }),
    );
  }
  return { productId, productCode, stockItemId };
}

async function openSession(stockItemId: string) {
  const result = await openStockCount(openingForm(stockItemId));
  expect(result.ok).toBe(true);
  return prisma.stockCountSession.findUniqueOrThrow({
    where: { countNumber: result.countNumber },
  });
}

describe("atomic stock count sessions with SQLite", () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: actorId,
        email: `${suffix}@count.example`,
        name: "Sayım Test Operatörü",
        role: "WAREHOUSE_STAFF",
        status: "ACTIVE",
      },
    });
    mocks.requirePermissionUser.mockResolvedValue({ id: actorId });
    await prisma.warehouse.create({
      data: {
        code: warehouseCode,
        name: "Sayım Test Deposu",
        isActive: true,
      },
    });
    await prisma.productCategory.create({
      data: {
        id: categoryId,
        slug: `count-${suffix}`,
        name: "Sayım Test",
      },
    });
  });

  it("captures the balance and movement sequence and replays the opening key", async () => {
    const stock = await createCountStock("snapshot", 12, 3);
    const key = randomUUID();
    const first = await openStockCount(openingForm(stock.stockItemId, key));
    const replay = await openStockCount(openingForm(stock.stockItemId, key));
    expect(first.ok).toBe(true);
    expect(replay).toMatchObject({
      ok: true,
      countNumber: first.countNumber,
    });
    const session = await prisma.stockCountSession.findUniqueOrThrow({
      where: { countNumber: first.countNumber },
    });
    expect(session).toMatchObject({
      expectedQuantity: 12,
      expectedReservedQuantity: 3,
      expectedMovementSequence: 1,
      status: "OPEN",
    });
    expect(
      await prisma.stockCountSession.count({
        where: { stockItemId: stock.stockItemId, status: "OPEN" },
      }),
    ).toBe(1);
  });

  it("applies a positive difference, preserves reservations and writes an audit movement", async () => {
    const stock = await createCountStock("positive", 8, 2);
    const session = await openSession(stock.stockItemId);
    const key = randomUUID();
    const first = await completeStockCount(
      completionForm(session.id, 11, key),
    );
    const replay = await completeStockCount(
      completionForm(session.id, 11, key),
    );
    const conflict = await completeStockCount(
      completionForm(session.id, 12, key),
    );
    expect(first.ok).toBe(true);
    expect(replay.ok).toBe(true);
    expect(conflict.ok).toBe(false);
    expect(conflict.message).toContain("farklı bir sayım sonucu");
    expect(
      await prisma.stockItem.findUniqueOrThrow({
        where: { id: stock.stockItemId },
      }),
    ).toMatchObject({ quantity: 11, reservedQuantity: 2 });
    const completed = await prisma.stockCountSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(completed).toMatchObject({
      status: "APPLIED",
      countedQuantity: 11,
      differenceQuantity: 3,
    });
    expect(completed.movementId).toBeTruthy();
    expect(
      await prisma.stockMovement.count({
        where: {
          stockItemId: stock.stockItemId,
          movementType: "INVENTORY_COUNT",
        },
      }),
    ).toBe(1);
  });

  it("applies a negative difference without reducing active reservations", async () => {
    const stock = await createCountStock("negative", 14, 4);
    const session = await openSession(stock.stockItemId);
    const result = await completeStockCount(completionForm(session.id, 9));
    expect(result.ok).toBe(true);
    expect(
      await prisma.stockItem.findUniqueOrThrow({
        where: { id: stock.stockItemId },
      }),
    ).toMatchObject({ quantity: 9, reservedQuantity: 4 });
    expect(
      await prisma.stockCountSession.findUniqueOrThrow({
        where: { id: session.id },
      }),
    ).toMatchObject({
      status: "APPLIED",
      countedQuantity: 9,
      differenceQuantity: -5,
    });
  });

  it("records a zero-difference count as evidence", async () => {
    const stock = await createCountStock("zero", 6, 1);
    const session = await openSession(stock.stockItemId);
    const result = await completeStockCount(completionForm(session.id, 6));
    expect(result.ok).toBe(true);
    const movement = await prisma.stockMovement.findFirstOrThrow({
      where: {
        stockItemId: stock.stockItemId,
        movementType: "INVENTORY_COUNT",
      },
    });
    expect(movement).toMatchObject({
      physicalDelta: 0,
      reservedDelta: 0,
      beforeQuantity: 6,
      afterQuantity: 6,
    });
  });

  it("stores a below-reservation result for review without changing stock", async () => {
    const stock = await createCountStock("reserved", 10, 7);
    const session = await openSession(stock.stockItemId);
    const result = await completeStockCount(completionForm(session.id, 5));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("rezerve miktarın altında");
    expect(
      await prisma.stockItem.findUniqueOrThrow({
        where: { id: stock.stockItemId },
      }),
    ).toMatchObject({ quantity: 10, reservedQuantity: 7 });
    expect(
      await prisma.stockCountSession.findUniqueOrThrow({
        where: { id: session.id },
      }),
    ).toMatchObject({
      status: "STALE",
      countedQuantity: 5,
      staleCode: "COUNT_BELOW_RESERVED",
      movementId: null,
    });
  });

  it("stores a stale result without overwriting a later stock movement", async () => {
    const stock = await createCountStock("stale", 9);
    const session = await openSession(stock.stockItemId);
    await prisma.$transaction(async (tx) => {
      const current = await tx.stockItem.findUniqueOrThrow({
        where: { id: stock.stockItemId },
      });
      await tx.stockItem.update({
        where: { id: current.id },
        data: { quantity: 10 },
      });
      await recordStockMovement(tx, {
        stockItemId: current.id,
        productId: stock.productId,
        productCode: stock.productCode,
        warehouseCode,
        movementType: "MANUAL_ADJUSTMENT",
        before: { quantity: 9, reservedQuantity: 0 },
        after: { quantity: 10, reservedQuantity: 0 },
        actorUserId: actorId,
        reason: "Sayım devam ederken yapılan kontrollü stok girişi.",
        sourceType: "TEST_FIXTURE",
        sourceId: `${session.id}:stale`,
        idempotencyKey: `count-stale:${session.id}`,
      });
    });
    const result = await completeStockCount(completionForm(session.id, 8));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("stok değiştiği için");
    expect(
      await prisma.stockItem.findUniqueOrThrow({
        where: { id: stock.stockItemId },
      }),
    ).toMatchObject({ quantity: 10 });
    expect(
      await prisma.stockCountSession.findUniqueOrThrow({
        where: { id: session.id },
      }),
    ).toMatchObject({
      status: "STALE",
      countedQuantity: 8,
      staleCode: "COUNT_STALE_BALANCE",
    });
  });

  it("cancels an open session without changing stock", async () => {
    const stock = await createCountStock("cancel", 4);
    const session = await openSession(stock.stockItemId);
    const result = await cancelStockCount(cancellationForm(session.id));
    expect(result.ok).toBe(true);
    expect(
      await prisma.stockCountSession.findUniqueOrThrow({
        where: { id: session.id },
      }),
    ).toMatchObject({ status: "CANCELLED" });
    expect(
      await prisma.stockItem.findUniqueOrThrow({
        where: { id: stock.stockItemId },
      }),
    ).toMatchObject({ quantity: 4 });
  });

  it("allows only one of two competing submissions to apply", async () => {
    const stock = await createCountStock("race", 5);
    const session = await openSession(stock.stockItemId);
    const results = await Promise.all([
      completeStockCount(completionForm(session.id, 6)),
      completeStockCount(completionForm(session.id, 7)),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      await prisma.stockMovement.count({
        where: {
          stockItemId: stock.stockItemId,
          movementType: "INVENTORY_COUNT",
        },
      }),
    ).toBe(1);
    const finalStock = await prisma.stockItem.findUniqueOrThrow({
      where: { id: stock.stockItemId },
    });
    expect([6, 7]).toContain(finalStock.quantity);
  });

  it("keeps terminal count evidence immutable", async () => {
    const stock = await createCountStock("immutable", 3);
    const session = await openSession(stock.stockItemId);
    await completeStockCount(completionForm(session.id, 3));
    await expect(
      prisma.stockCountSession.update({
        where: { id: session.id },
        data: { submissionReason: "Bu kayıt değiştirilemez." },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.stockCountSession.delete({ where: { id: session.id } }),
    ).rejects.toThrow();
  });
});
