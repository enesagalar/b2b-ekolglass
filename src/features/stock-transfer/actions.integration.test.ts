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

import { createStockTransfer } from "./actions";

const suffix = randomUUID().replaceAll("-", "");
const actorId = `transfer-actor-${suffix}`;
const categoryId = `transfer-category-${suffix}`;
const sourceWarehouseCode = `S${suffix.slice(0, 12).toUpperCase()}`;
const destinationWarehouseCode = `D${suffix.slice(0, 12).toUpperCase()}`;
const productId = `transfer-product-${suffix}`;
const rollbackProductId = `transfer-rollback-product-${suffix}`;
const raceProductId = `transfer-race-product-${suffix}`;
const firstTransferKey = randomUUID();

function form(values: {
  productId: string;
  sourceWarehouseCode?: string;
  destinationWarehouseCode?: string;
  quantity: number;
  reason: string;
  idempotencyKey: string;
}) {
  const formData = new FormData();
  formData.set("productId", values.productId);
  formData.set(
    "sourceWarehouseCode",
    values.sourceWarehouseCode ?? sourceWarehouseCode,
  );
  formData.set(
    "destinationWarehouseCode",
    values.destinationWarehouseCode ?? destinationWarehouseCode,
  );
  formData.set("quantity", String(values.quantity));
  formData.set("reason", values.reason);
  formData.set("idempotencyKey", values.idempotencyKey);
  formData.set("confirmed", "on");
  return formData;
}

async function createStockWithOpeningMovement({
  id,
  productId: targetProductId,
  productCode,
  warehouseCode,
  quantity,
  reservedQuantity = 0,
}: {
  id: string;
  productId: string;
  productCode: string;
  warehouseCode: string;
  quantity: number;
  reservedQuantity?: number;
}) {
  await prisma.stockItem.create({
    data: {
      id,
      productId: targetProductId,
      warehouseCode,
      quantity,
      reservedQuantity,
      status: "IN_STOCK",
    },
  });
  await prisma.$transaction((tx) =>
    recordStockMovement(tx, {
      stockItemId: id,
      productId: targetProductId,
      productCode,
      warehouseCode,
      movementType: "OPENING_BALANCE",
      before: { quantity: 0, reservedQuantity: 0 },
      after: { quantity, reservedQuantity },
      reason: "Transfer entegrasyon testi açılış bakiyesi.",
      sourceType: "TEST_FIXTURE",
      sourceId: id,
      idempotencyKey: `transfer-fixture:${id}`,
    }),
  );
}

describe("atomic warehouse transfers with SQLite", () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: actorId,
        email: `${suffix}@transfer.example`,
        name: "Transfer Test Operator",
        role: "WAREHOUSE_STAFF",
        status: "ACTIVE",
      },
    });
    mocks.requirePermissionUser.mockResolvedValue({ id: actorId });
    await prisma.warehouse.createMany({
      data: [
        {
          code: sourceWarehouseCode,
          name: "Transfer Kaynak Depo",
          isActive: true,
        },
        {
          code: destinationWarehouseCode,
          name: "Transfer Hedef Depo",
          isActive: true,
        },
      ],
    });
    await prisma.productCategory.create({
      data: {
        id: categoryId,
        slug: `transfer-${suffix}`,
        name: "Transfer Test",
      },
    });
    await prisma.product.createMany({
      data: [
        {
          id: productId,
          code: `TR-${suffix.slice(0, 10)}`,
          name: "Transfer Test Product",
          categoryId,
          glassType: "Lamine",
        },
        {
          id: rollbackProductId,
          code: `RB-${suffix.slice(0, 10)}`,
          name: "Transfer Rollback Product",
          categoryId,
          glassType: "Temperli",
        },
        {
          id: raceProductId,
          code: `RC-${suffix.slice(0, 10)}`,
          name: "Transfer Race Product",
          categoryId,
          glassType: "Lamine",
        },
      ],
    });

    await createStockWithOpeningMovement({
      id: `transfer-source-stock-${suffix}`,
      productId,
      productCode: `TR-${suffix.slice(0, 10)}`,
      warehouseCode: sourceWarehouseCode,
      quantity: 12,
      reservedQuantity: 3,
    });
    await createStockWithOpeningMovement({
      id: `transfer-destination-stock-${suffix}`,
      productId,
      productCode: `TR-${suffix.slice(0, 10)}`,
      warehouseCode: destinationWarehouseCode,
      quantity: 2,
    });
  });

  it("moves only available stock and writes two correlated ledger legs", async () => {
    const result = await createStockTransfer(
      form({
        productId,
        quantity: 4,
        reason: "Hedef deponun haftalık satış ihtiyacı için transfer.",
        idempotencyKey: firstTransferKey,
      }),
    );

    expect(result.ok).toBe(true);
    const transfer = await prisma.stockTransfer.findUniqueOrThrow({
      where: { idempotencyKey: firstTransferKey },
    });
    const [source, destination, movements, audit] = await Promise.all([
      prisma.stockItem.findUniqueOrThrow({
        where: {
          productId_warehouseCode: {
            productId,
            warehouseCode: sourceWarehouseCode,
          },
        },
      }),
      prisma.stockItem.findUniqueOrThrow({
        where: {
          productId_warehouseCode: {
            productId,
            warehouseCode: destinationWarehouseCode,
          },
        },
      }),
      prisma.stockMovement.findMany({
        where: { sourceType: "WAREHOUSE_TRANSFER", sourceId: transfer.id },
        orderBy: { movementType: "asc" },
      }),
      prisma.auditLog.findFirst({
        where: {
          action: "stock.transferred",
          entityType: "StockTransfer",
          entityId: transfer.id,
        },
      }),
    ]);

    expect(source).toMatchObject({ quantity: 8, reservedQuantity: 3 });
    expect(destination).toMatchObject({ quantity: 6, reservedQuantity: 0 });
    expect(movements).toHaveLength(2);
    expect(movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: transfer.sourceMovementId,
          movementType: "TRANSFER_OUT",
          physicalDelta: -4,
          reservedDelta: 0,
        }),
        expect.objectContaining({
          id: transfer.destinationMovementId,
          movementType: "TRANSFER_IN",
          physicalDelta: 4,
          reservedDelta: 0,
        }),
      ]),
    );
    expect(transfer).toMatchObject({
      sourceStockItemId: source.id,
      destinationStockItemId: destination.id,
      quantity: 4,
      actorUserId: actorId,
    });
    expect(audit).toBeTruthy();
  });

  it("replays the same command without a second stock effect", async () => {
    const result = await createStockTransfer(
      form({
        productId,
        quantity: 4,
        reason: "Hedef deponun haftalık satış ihtiyacı için transfer.",
        idempotencyKey: firstTransferKey,
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.message).toContain("daha önce tamamlanmış");
    expect(
      await prisma.stockTransfer.count({
        where: { idempotencyKey: firstTransferKey },
      }),
    ).toBe(1);
    expect(
      await prisma.stockMovement.count({
        where: { sourceType: "WAREHOUSE_TRANSFER", productId },
      }),
    ).toBe(2);
  });

  it("rejects a reused key with a different payload or actor", async () => {
    const differentPayload = await createStockTransfer(
      form({
        productId,
        quantity: 2,
        reason: "Hedef deponun haftalık satış ihtiyacı için transfer.",
        idempotencyKey: firstTransferKey,
      }),
    );
    expect(differentPayload.ok).toBe(false);
    expect(differentPayload.message).toContain("farklı bir transfer");

    mocks.requirePermissionUser.mockResolvedValueOnce({ id: "another-actor" });
    const differentActor = await createStockTransfer(
      form({
        productId,
        quantity: 4,
        reason: "Hedef deponun haftalık satış ihtiyacı için transfer.",
        idempotencyKey: firstTransferKey,
      }),
    );
    expect(differentActor.ok).toBe(false);
    expect(differentActor.message).toContain("farklı bir transfer");
  });

  it("rejects quantity above available stock without any write", async () => {
    const key = randomUUID();
    const result = await createStockTransfer(
      form({
        productId,
        quantity: 6,
        reason: "Kullanılabilir stok sınırını doğrulayan transfer denemesi.",
        idempotencyKey: key,
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain("kullanılabilir stoktan fazla");
    expect(
      await prisma.stockTransfer.count({ where: { idempotencyKey: key } }),
    ).toBe(0);
  });

  it("rolls back both balances when the destination ledger leg fails", async () => {
    const sourceStockId = `rollback-source-stock-${suffix}`;
    const destinationStockId = `rollback-destination-stock-${suffix}`;
    await createStockWithOpeningMovement({
      id: sourceStockId,
      productId: rollbackProductId,
      productCode: `RB-${suffix.slice(0, 10)}`,
      warehouseCode: sourceWarehouseCode,
      quantity: 10,
    });
    await createStockWithOpeningMovement({
      id: destinationStockId,
      productId: rollbackProductId,
      productCode: `RB-${suffix.slice(0, 10)}`,
      warehouseCode: destinationWarehouseCode,
      quantity: 2,
    });
    await prisma.stockItem.update({
      where: { id: destinationStockId },
      data: { quantity: 3 },
    });

    const key = randomUUID();
    const result = await createStockTransfer(
      form({
        productId: rollbackProductId,
        quantity: 2,
        reason: "İkinci hareket bacağında rollback doğrulama transferi.",
        idempotencyKey: key,
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      await prisma.stockItem.findUniqueOrThrow({
        where: { id: sourceStockId },
      }),
    ).toMatchObject({ quantity: 10 });
    expect(
      await prisma.stockItem.findUniqueOrThrow({
        where: { id: destinationStockId },
      }),
    ).toMatchObject({ quantity: 3 });
    expect(
      await prisma.stockTransfer.count({ where: { idempotencyKey: key } }),
    ).toBe(0);
    expect(
      await prisma.stockMovement.count({
        where: {
          sourceType: "WAREHOUSE_TRANSFER",
          productId: rollbackProductId,
        },
      }),
    ).toBe(0);
  });

  it("serializes competing transfers and never oversells available stock", async () => {
    await createStockWithOpeningMovement({
      id: `race-source-stock-${suffix}`,
      productId: raceProductId,
      productCode: `RC-${suffix.slice(0, 10)}`,
      warehouseCode: sourceWarehouseCode,
      quantity: 5,
    });
    await createStockWithOpeningMovement({
      id: `race-destination-stock-${suffix}`,
      productId: raceProductId,
      productCode: `RC-${suffix.slice(0, 10)}`,
      warehouseCode: destinationWarehouseCode,
      quantity: 0,
    });

    const reason = "Aynı kaynak bakiyesine eşzamanlı transfer yarışı testi.";
    const results = await Promise.all([
      createStockTransfer(
        form({
          productId: raceProductId,
          quantity: 4,
          reason,
          idempotencyKey: randomUUID(),
        }),
      ),
      createStockTransfer(
        form({
          productId: raceProductId,
          quantity: 4,
          reason,
          idempotencyKey: randomUUID(),
        }),
      ),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    expect(
      await prisma.stockItem.findUniqueOrThrow({
        where: {
          productId_warehouseCode: {
            productId: raceProductId,
            warehouseCode: sourceWarehouseCode,
          },
        },
      }),
    ).toMatchObject({ quantity: 1 });
    expect(
      await prisma.stockTransfer.count({ where: { productId: raceProductId } }),
    ).toBe(1);
  });

  it("keeps completed transfer records append-only", async () => {
    const transfer = await prisma.stockTransfer.findUniqueOrThrow({
      where: { idempotencyKey: firstTransferKey },
    });
    await expect(
      prisma.stockTransfer.update({
        where: { id: transfer.id },
        data: { reason: "Değiştirilemez" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.stockTransfer.delete({ where: { id: transfer.id } }),
    ).rejects.toThrow();
  });
});
