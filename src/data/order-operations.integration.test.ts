import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { transitionOrderStatus } from "@/data/order-operations";
import { recordStockMovement } from "@/domain/stock-movement";
import { prisma } from "@/lib/prisma";

const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const ids = {
  company: `order-operations-company-${suffix}`,
  user: `order-operations-user-${suffix}`,
  category: `order-operations-category-${suffix}`,
  productA: `order-operations-product-a-${suffix}`,
  productB: `order-operations-product-b-${suffix}`,
  stockA: `order-operations-stock-a-${suffix}`,
  stockB: `order-operations-stock-b-${suffix}`,
};
const actor = { userId: ids.user };
const orderIds = new Set<string>();
let originalCheckoutLock: { version: number; updatedAt: Date } | null = null;

async function adjustFixtureStock(stockItemId: string, quantity: number, reservedQuantity: number) {
  await prisma.$transaction(async (tx) => {
    const before = await tx.stockItem.findUniqueOrThrow({
      where: { id: stockItemId },
      include: { product: { select: { code: true } } },
    });
    if (before.quantity === quantity && before.reservedQuantity === reservedQuantity) return;
    const after = await tx.stockItem.update({
      where: { id: stockItemId },
      data: { quantity, reservedQuantity },
    });
    await recordStockMovement(tx, {
      stockItemId,
      productId: before.productId,
      productCode: before.product.code,
      warehouseCode: before.warehouseCode,
      movementType: "MANUAL_ADJUSTMENT",
      before: { quantity: before.quantity, reservedQuantity: before.reservedQuantity },
      after: { quantity: after.quantity, reservedQuantity: after.reservedQuantity },
      actorUserId: ids.user,
      reason: "Entegrasyon testi stok fixture bakiyesi ayari.",
      sourceType: "TEST_FIXTURE",
      sourceId: stockItemId,
      idempotencyKey: `test-fixture:${stockItemId}:${randomUUID()}`,
    });
  });
}

type ItemFixture = {
  productId: string;
  quantity: number;
  reservations?: Array<{
    stockItemId: string;
    quantity: number;
    status?: string;
    consumedAt?: Date;
  }>;
};

async function createOrder(
  status: string,
  items: ItemFixture[] = [],
  shipmentMethod = "ROAD",
) {
  const id = `order-operations-order-${randomUUID()}`;
  orderIds.add(id);

  return prisma.order.create({
    data: {
      id,
      orderNumber: `OPS-${randomUUID()}`,
      companyId: ids.company,
      createdById: ids.user,
      status,
      shipmentMethod,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          productCodeSnapshot: `SNAPSHOT-${item.productId}`,
          productNameSnapshot: "Operation test product",
          glassTypeSnapshot: "Lamine",
          reservations: {
            create: (item.reservations ?? []).map((reservation) => ({
              stockItemId: reservation.stockItemId,
              quantity: reservation.quantity,
              status: reservation.status ?? "ACTIVE",
              consumedAt: reservation.consumedAt,
            })),
          },
        })),
      },
    },
  });
}

async function expectHistoryAndAudit(
  orderId: string,
  fromStatus: string,
  toStatus: string,
  idempotencyKey: string,
  note: string,
  reservationQuantity: number,
  stockChanges: Array<Record<string, string | number>>,
) {
  const history = await prisma.orderStatusHistory.findMany({
    where: { orderId },
  });
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({
    fromStatus,
    toStatus,
    changedById: ids.user,
    note,
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: "order.status.changed",
      entityType: "Order",
      entityId: orderId,
    },
  });
  expect(auditLogs).toHaveLength(1);
  expect(auditLogs[0]?.actorUserId).toBe(ids.user);
  expect(JSON.parse(auditLogs[0]?.metadata ?? "null")).toEqual({
    fromStatus,
    toStatus,
    fromVersion: 1,
    toVersion: 2,
    idempotencyKey,
    note,
    reservationQuantity,
    stockChanges,
  });

  const commands = await prisma.orderTransitionCommand.findMany({
    where: { orderId },
  });
  expect(commands).toHaveLength(1);
  expect(commands[0]).toMatchObject({
    idempotencyKey,
    fromStatus,
    toStatus,
    resultVersion: 2,
    createdById: ids.user,
  });
}

async function cleanupRuntimeFixtures() {
  const currentOrderIds = [...orderIds];
  await prisma.integrationOutboxEvent.deleteMany({
    where: { aggregateId: { in: currentOrderIds } },
  });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: ids.user },
        { entityType: "Order", entityId: { in: currentOrderIds } },
      ],
    },
  });
  await prisma.stockReservation.deleteMany({
    where: { stockItemId: { in: [ids.stockA, ids.stockB] } },
  });
  await prisma.orderTransitionCommand.deleteMany({
    where: { orderId: { in: currentOrderIds } },
  });
  await prisma.order.deleteMany({ where: { id: { in: currentOrderIds } } });
  orderIds.clear();

  await adjustFixtureStock(ids.stockA, 20, 0);
  await adjustFixtureStock(ids.stockB, 20, 0);
}

describe("order status operations", () => {
  beforeAll(async () => {
    originalCheckoutLock = await prisma.checkoutLock.findUnique({
      where: { id: "order-checkout" },
      select: { version: true, updatedAt: true },
    });

    await prisma.company.create({
      data: {
        id: ids.company,
        legalName: "Order Operations Test",
        displayName: "Order Operations",
        email: `order-operations-${suffix}@example.com`,
        phone: "1",
        city: "Istanbul",
        status: "APPROVED",
      },
    });
    await prisma.user.create({
      data: {
        id: ids.user,
        email: `order-operations-user-${suffix}@example.com`,
        name: "Order Operations User",
        role: "ADMIN",
        status: "ACTIVE",
        companyId: ids.company,
      },
    });
    await prisma.productCategory.create({
      data: {
        id: ids.category,
        slug: `order-operations-${suffix}`,
        name: "Order Operations Test",
      },
    });
    await prisma.product.createMany({
      data: [
        {
          id: ids.productA,
          code: `OPS-A-${suffix}`,
          name: "Operations Product A",
          categoryId: ids.category,
          glassType: "Lamine",
          status: "ACTIVE",
        },
        {
          id: ids.productB,
          code: `OPS-B-${suffix}`,
          name: "Operations Product B",
          categoryId: ids.category,
          glassType: "Temperli",
          status: "ACTIVE",
        },
      ],
    });
    await prisma.stockItem.createMany({
      data: [
        {
          id: ids.stockA,
          productId: ids.productA,
          warehouseCode: `OPS-A-${suffix}`,
          quantity: 20,
          reservedQuantity: 0,
          status: "IN_STOCK",
        },
        {
          id: ids.stockB,
          productId: ids.productA,
          warehouseCode: `OPS-B-${suffix}`,
          quantity: 20,
          reservedQuantity: 0,
          status: "IN_STOCK",
        },
      ],
    });
    await adjustFixtureStock(ids.stockA, 20, 0);
    await adjustFixtureStock(ids.stockB, 20, 0);
  });

  afterEach(cleanupRuntimeFixtures);

  afterAll(async () => {
    await cleanupRuntimeFixtures();
    await prisma.stockItem.deleteMany({
      where: { id: { in: [ids.stockA, ids.stockB] } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [ids.productA, ids.productB] } },
    });
    await prisma.productCategory.deleteMany({ where: { id: ids.category } });
    await prisma.user.deleteMany({ where: { id: ids.user } });
    await prisma.company.deleteMany({ where: { id: ids.company } });

    if (originalCheckoutLock) {
      await prisma.checkoutLock.upsert({
        where: { id: "order-checkout" },
        create: { id: "order-checkout", version: originalCheckoutLock.version },
        update: {
          version: originalCheckoutLock.version,
          updatedAt: originalCheckoutLock.updatedAt,
        },
      });
    } else {
      await prisma.checkoutLock.deleteMany({ where: { id: "order-checkout" } });
    }
  });

  it("rejects a stale expected status or version without writing history or audit", async () => {
    const order = await createOrder("SUBMITTED");
    const idempotencyKey = randomUUID();

    await expect(
      transitionOrderStatus(actor, {
        orderId: order.id,
        expectedStatus: "SUBMITTED",
        expectedVersion: order.version + 1,
        targetStatus: "WAITING_FOR_APPROVAL",
        idempotencyKey,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe("SUBMITTED");
    expect(
      await prisma.orderStatusHistory.count({ where: { orderId: order.id } }),
    ).toBe(0);
    expect(
      await prisma.orderTransitionCommand.count({
        where: { orderId: order.id },
      }),
    ).toBe(0);
    expect(await prisma.auditLog.count({ where: { entityId: order.id } })).toBe(
      0,
    );
  });

  it("releases active reservations on cancellation without changing stock quantity", async () => {
    await adjustFixtureStock(ids.stockA, 12, 4);
    const order = await createOrder("CONFIRMED", [
      {
        productId: ids.productA,
        quantity: 4,
        reservations: [{ stockItemId: ids.stockA, quantity: 4 }],
      },
    ]);
    const idempotencyKey = randomUUID();

    const result = await transitionOrderStatus(actor, {
      orderId: order.id,
      expectedStatus: "CONFIRMED",
      expectedVersion: order.version,
      targetStatus: "CANCELLED",
      idempotencyKey,
      note: "Customer cancelled",
    });

    expect(result).toEqual({
      id: order.id,
      status: "CANCELLED",
      version: 2,
      replayed: false,
    });
    expect(
      await prisma.stockItem.findUniqueOrThrow({ where: { id: ids.stockA } }),
    ).toMatchObject({
      quantity: 12,
      reservedQuantity: 0,
    });
    const reservation = await prisma.stockReservation.findFirstOrThrow({
      where: { orderItem: { orderId: order.id } },
    });
    expect(reservation).toMatchObject({
      status: "RELEASED",
      releaseReason: "ORDER_CANCELLED",
    });
    expect(reservation.releasedAt).toBeInstanceOf(Date);
    expect(await prisma.stockMovement.findFirstOrThrow({
      where: { sourceType: "ORDER_TRANSITION", sourceId: order.id, movementType: "ORDER_RELEASE" },
    })).toMatchObject({
      physicalDelta: 0,
      reservedDelta: -4,
      beforeQuantity: 12,
      afterQuantity: 12,
      beforeReservedQuantity: 4,
      afterReservedQuantity: 0,
    });
    await expectHistoryAndAudit(
      order.id,
      "CONFIRMED",
      "CANCELLED",
      idempotencyKey,
      "Customer cancelled",
      4,
      [
        {
          stockItemId: ids.stockA,
          warehouseCode: `OPS-A-${suffix}`,
          quantity: 4,
          beforeQuantity: 12,
          afterQuantity: 12,
          beforeReservedQuantity: 4,
          afterReservedQuantity: 0,
        },
      ],
    );
  });

  it("consumes every reservation, decrements stock, and creates a shipment when shipped", async () => {
    await adjustFixtureStock(ids.stockA, 8, 2);
    await adjustFixtureStock(ids.stockB, 10, 3);
    const order = await createOrder("READY_FOR_SHIPMENT", [
      {
        productId: ids.productA,
        quantity: 5,
        reservations: [
          { stockItemId: ids.stockA, quantity: 2 },
          { stockItemId: ids.stockB, quantity: 3 },
        ],
      },
    ]);
    const idempotencyKey = randomUUID();

    const result = await transitionOrderStatus(actor, {
      orderId: order.id,
      expectedStatus: "READY_FOR_SHIPMENT",
      expectedVersion: order.version,
      targetStatus: "SHIPPED",
      idempotencyKey,
      note: "Loaded on truck",
      carrier: "Ekol Logistics",
      trackingNumber: "TRK-12345",
    });

    expect(result).toEqual({
      id: order.id,
      status: "SHIPPED",
      version: 2,
      replayed: false,
    });
    const stocks = await prisma.stockItem.findMany({
      where: { id: { in: [ids.stockA, ids.stockB] } },
      orderBy: { id: "asc" },
      select: { id: true, quantity: true, reservedQuantity: true },
    });
    expect(stocks).toEqual([
      { id: ids.stockA, quantity: 6, reservedQuantity: 0 },
      { id: ids.stockB, quantity: 7, reservedQuantity: 0 },
    ]);
    const reservations = await prisma.stockReservation.findMany({
      where: { orderItem: { orderId: order.id } },
    });
    expect(reservations).toHaveLength(2);
    expect(
      reservations.every((reservation) => reservation.status === "CONSUMED"),
    ).toBe(true);
    expect(
      reservations.every(
        (reservation) => reservation.consumedAt instanceof Date,
      ),
    ).toBe(true);
    const shipment = await prisma.shipment.findUniqueOrThrow({
      where: { orderId: order.id },
    });
    expect(shipment).toMatchObject({
      status: "SHIPPED",
      carrier: "Ekol Logistics",
      trackingNumber: "TRK-12345",
    });
    expect(shipment.shippedAt).toBeInstanceOf(Date);
    expect(await prisma.stockMovement.findMany({
      where: { sourceType: "ORDER_TRANSITION", sourceId: order.id, movementType: "ORDER_CONSUME" },
      orderBy: { stockItemId: "asc" },
      select: {
        stockItemId: true,
        physicalDelta: true,
        reservedDelta: true,
        beforeQuantity: true,
        afterQuantity: true,
        beforeReservedQuantity: true,
        afterReservedQuantity: true,
      },
    })).toEqual([
      { stockItemId: ids.stockA, physicalDelta: -2, reservedDelta: -2, beforeQuantity: 8, afterQuantity: 6, beforeReservedQuantity: 2, afterReservedQuantity: 0 },
      { stockItemId: ids.stockB, physicalDelta: -3, reservedDelta: -3, beforeQuantity: 10, afterQuantity: 7, beforeReservedQuantity: 3, afterReservedQuantity: 0 },
    ]);
    await expectHistoryAndAudit(
      order.id,
      "READY_FOR_SHIPMENT",
      "SHIPPED",
      idempotencyKey,
      "Loaded on truck",
      5,
      [
        {
          stockItemId: ids.stockA,
          warehouseCode: `OPS-A-${suffix}`,
          quantity: 2,
          beforeQuantity: 8,
          afterQuantity: 6,
          beforeReservedQuantity: 2,
          afterReservedQuantity: 0,
        },
        {
          stockItemId: ids.stockB,
          warehouseCode: `OPS-B-${suffix}`,
          quantity: 3,
          beforeQuantity: 10,
          afterQuantity: 7,
          beforeReservedQuantity: 3,
          afterReservedQuantity: 0,
        },
      ],
    );
  });

  it("rolls back shipping when an order item is missing an active reservation", async () => {
    await adjustFixtureStock(ids.stockA, 9, 2);
    const order = await createOrder("READY_FOR_SHIPMENT", [
      {
        productId: ids.productA,
        quantity: 5,
        reservations: [{ stockItemId: ids.stockA, quantity: 2 }],
      },
    ]);

    await expect(
      transitionOrderStatus(actor, {
        orderId: order.id,
        expectedStatus: "READY_FOR_SHIPMENT",
        expectedVersion: order.version,
        targetStatus: "SHIPPED",
        idempotencyKey: randomUUID(),
        carrier: "Ekol Logistics",
        trackingNumber: "TRK-MISSING",
      }),
    ).rejects.toMatchObject({ code: "STOCK_INTEGRITY" });

    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe("READY_FOR_SHIPMENT");
    expect(
      await prisma.stockItem.findUniqueOrThrow({ where: { id: ids.stockA } }),
    ).toMatchObject({
      quantity: 9,
      reservedQuantity: 2,
    });
    expect(
      await prisma.stockReservation.findFirstOrThrow({
        where: { orderItem: { orderId: order.id } },
      }),
    ).toMatchObject({ status: "ACTIVE", quantity: 2, consumedAt: null });
    expect(await prisma.shipment.count({ where: { orderId: order.id } })).toBe(
      0,
    );
    expect(
      await prisma.orderStatusHistory.count({ where: { orderId: order.id } }),
    ).toBe(0);
    expect(
      await prisma.orderTransitionCommand.count({
        where: { orderId: order.id },
      }),
    ).toBe(0);
    expect(await prisma.auditLog.count({ where: { entityId: order.id } })).toBe(
      0,
    );
  });

  it("marks the shipment delivered and records its delivery date", async () => {
    const consumedAt = new Date("2026-01-02T03:00:00.000Z");
    const order = await createOrder("SHIPPED", [
      {
        productId: ids.productA,
        quantity: 2,
        reservations: [
          {
            stockItemId: ids.stockA,
            quantity: 2,
            status: "CONSUMED",
            consumedAt,
          },
        ],
      },
    ]);
    const shippedAt = new Date("2026-01-02T03:04:05.000Z");
    await prisma.shipment.create({
      data: { orderId: order.id, status: "SHIPPED", shippedAt },
    });
    const beforeTransition = new Date();
    const idempotencyKey = randomUUID();

    await transitionOrderStatus(actor, {
      orderId: order.id,
      expectedStatus: "SHIPPED",
      expectedVersion: order.version,
      targetStatus: "DELIVERED",
      idempotencyKey,
      note: "Signed by recipient",
    });

    const shipment = await prisma.shipment.findUniqueOrThrow({
      where: { orderId: order.id },
    });
    expect(shipment.status).toBe("DELIVERED");
    expect(shipment.shippedAt).toEqual(shippedAt);
    expect(shipment.deliveredAt).toBeInstanceOf(Date);
    expect(shipment.deliveredAt!.getTime()).toBeGreaterThanOrEqual(
      beforeTransition.getTime(),
    );
    await expectHistoryAndAudit(
      order.id,
      "SHIPPED",
      "DELIVERED",
      idempotencyKey,
      "Signed by recipient",
      0,
      [],
    );
  });

  it("replays an identical idempotent transition without duplicate side effects", async () => {
    const order = await createOrder("SUBMITTED");
    const input = {
      orderId: order.id,
      expectedStatus: "SUBMITTED" as const,
      expectedVersion: order.version,
      targetStatus: "WAITING_FOR_APPROVAL" as const,
      idempotencyKey: randomUUID(),
      note: "Review requested",
    };

    const first = await transitionOrderStatus(actor, input);
    const replay = await transitionOrderStatus(actor, input);

    expect(first).toEqual({
      id: order.id,
      status: "WAITING_FOR_APPROVAL",
      version: 2,
      replayed: false,
    });
    expect(replay).toEqual({
      id: order.id,
      status: "WAITING_FOR_APPROVAL",
      version: 2,
      replayed: true,
    });
    expect(
      await prisma.orderStatusHistory.count({ where: { orderId: order.id } }),
    ).toBe(1);
    expect(
      await prisma.orderTransitionCommand.count({
        where: { orderId: order.id },
      }),
    ).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: order.id } })).toBe(
      1,
    );
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({
      status: "WAITING_FOR_APPROVAL",
      version: 2,
    });
  });

  it("creates a manual City shipment intent without an unsupported outbox event", async () => {
    const order = await createOrder("PREPARING", [], "CITY_LOJISTIK");

    await transitionOrderStatus(actor, {
      orderId: order.id,
      expectedStatus: "PREPARING",
      expectedVersion: order.version,
      targetStatus: "READY_FOR_SHIPMENT",
      idempotencyKey: randomUUID(),
    });

    const events = await prisma.integrationOutboxEvent.findMany({
      where: { aggregateId: order.id },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((event) => event.topic)).toEqual(["commerce.order.status_changed.v1"]);
    expect(await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } })).toMatchObject({
      carrier: "CITY_LOJISTIK",
      status: "AWAITING_MANUAL_DISPATCH",
      rawStatus: "API_CONTRACT_PENDING",
    });
  });

  it("rejects the same idempotency key when the payload differs", async () => {
    const order = await createOrder("SUBMITTED");
    const idempotencyKey = randomUUID();
    const input = {
      orderId: order.id,
      expectedStatus: "SUBMITTED" as const,
      expectedVersion: order.version,
      targetStatus: "WAITING_FOR_APPROVAL" as const,
      idempotencyKey,
      note: "Original payload",
    };
    await transitionOrderStatus(actor, input);

    await expect(
      transitionOrderStatus(actor, { ...input, note: "Changed payload" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(
      await prisma.orderStatusHistory.count({ where: { orderId: order.id } }),
    ).toBe(1);
    expect(
      await prisma.orderTransitionCommand.count({
        where: { orderId: order.id },
      }),
    ).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: order.id } })).toBe(
      1,
    );
  });

  it("blocks an over-limit confirmation and permits an audited authorized override", async () => {
    await prisma.company.update({
      where: { id: ids.company },
      data: {
        creditPolicy: "LIMITED",
        creditLimit: 100,
        paymentTerms: "30 gün",
      },
    });
    try {
      const existing = await createOrder("CONFIRMED");
      await prisma.order.update({ where: { id: existing.id }, data: { subtotal: 80 } });
      const candidate = await createOrder("WAITING_FOR_APPROVAL");
      await prisma.order.update({ where: { id: candidate.id }, data: { subtotal: 30 } });

      await expect(
        transitionOrderStatus(actor, {
          orderId: candidate.id,
          expectedStatus: "WAITING_FOR_APPROVAL",
          expectedVersion: candidate.version,
          targetStatus: "CONFIRMED",
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "COMMERCIAL_REVIEW_REQUIRED" });
      expect(
        await prisma.order.findUniqueOrThrow({ where: { id: candidate.id } }),
      ).toMatchObject({ status: "WAITING_FOR_APPROVAL", version: 1 });

      const reason = "Kredi komitesi istisna onayı verdi.";
      await transitionOrderStatus(
        { ...actor, canOverrideCredit: true },
        {
          orderId: candidate.id,
          expectedStatus: "WAITING_FOR_APPROVAL",
          expectedVersion: candidate.version,
          targetStatus: "CONFIRMED",
          idempotencyKey: randomUUID(),
          commercialOverrideReason: reason,
        },
      );
      const approved = await prisma.order.findUniqueOrThrow({
        where: { id: candidate.id },
      });
      expect(approved.status).toBe("CONFIRMED");
      expect(approved.creditExposureBefore.toString()).toBe("80");
      expect(approved.creditExposureAfter.toString()).toBe("110");
      expect(approved.commercialReviewRequired).toBe(true);
      expect(approved.commercialOverrideReason).toBe(reason);
      expect(approved.commercialOverrideById).toBe(ids.user);
      expect(approved.commercialOverrideAt).toBeInstanceOf(Date);
    } finally {
      await prisma.company.update({
        where: { id: ids.company },
        data: {
          creditPolicy: "UNSET",
          creditLimit: null,
          paymentTerms: null,
        },
      });
    }
  });
});
