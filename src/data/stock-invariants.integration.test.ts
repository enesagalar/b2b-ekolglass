import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

const suffix = randomUUID();
const ids = {
  category: `stock-check-category-${suffix}`,
  product: `stock-check-product-${suffix}`,
  company: `stock-check-company-${suffix}`,
  user: `stock-check-user-${suffix}`,
  order: `stock-check-order-${suffix}`,
  orderItem: `stock-check-order-item-${suffix}`,
  stock: `stock-check-stock-${suffix}`,
};

describe("stock database invariants", () => {
  beforeAll(async () => {
    await prisma.productCategory.create({
      data: {
        id: ids.category,
        slug: `stock-check-${suffix}`,
        name: "Stock Check",
      },
    });
    await prisma.product.create({
      data: {
        id: ids.product,
        code: `STOCK-CHECK-${suffix}`,
        name: "Stock Check Product",
        categoryId: ids.category,
        glassType: "Lamine",
      },
    });
    await prisma.company.create({
      data: {
        id: ids.company,
        legalName: "Stock Check Company",
        displayName: "Stock Check",
        email: `stock-check-${suffix}@example.com`,
        phone: "1",
        city: "Istanbul",
        status: "APPROVED",
      },
    });
    await prisma.user.create({
      data: {
        id: ids.user,
        email: `stock-check-user-${suffix}@example.com`,
        name: "Stock Check User",
        role: "DEALER_OWNER",
        status: "ACTIVE",
        companyId: ids.company,
      },
    });
    await prisma.order.create({
      data: {
        id: ids.order,
        orderNumber: `STOCK-CHECK-${suffix}`,
        companyId: ids.company,
        createdById: ids.user,
        status: "SUBMITTED",
      },
    });
    await prisma.orderItem.create({
      data: {
        id: ids.orderItem,
        orderId: ids.order,
        productId: ids.product,
        quantity: 3,
        productCodeSnapshot: "STOCK-CHECK",
        productNameSnapshot: "Stock Check Product",
        glassTypeSnapshot: "Lamine",
      },
    });
    await prisma.stockItem.create({
      data: {
        id: ids.stock,
        productId: ids.product,
        warehouseCode: "CHECK",
        quantity: 10,
        reservedQuantity: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.stockReservation.deleteMany({
      where: { stockItemId: ids.stock },
    });
    await prisma.orderItem.deleteMany({ where: { id: ids.orderItem } });
    await prisma.order.deleteMany({ where: { id: ids.order } });
    await prisma.stockItem.deleteMany({ where: { productId: ids.product } });
    await prisma.product.deleteMany({ where: { id: ids.product } });
    await prisma.productCategory.deleteMany({ where: { id: ids.category } });
    await prisma.user.deleteMany({ where: { id: ids.user } });
    await prisma.company.deleteMany({ where: { id: ids.company } });
  });

  it.each([
    { quantity: -1, reservedQuantity: 0 },
    { quantity: 10, reservedQuantity: -1 },
    { quantity: 2, reservedQuantity: 3 },
  ])("rejects invalid stock counters: %o", async (counters) => {
    await expect(
      prisma.stockItem.create({
        data: {
          productId: ids.product,
          warehouseCode: `INVALID-${randomUUID()}`,
          ...counters,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects lowering physical stock below the reserved counter", async () => {
    const activeReservation = await prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { id: ids.stock },
        data: { reservedQuantity: 3 },
      });
      return tx.stockReservation.create({
        data: {
          orderItemId: ids.orderItem,
          stockItemId: ids.stock,
          quantity: 3,
        },
      });
    });
    let constraintError: unknown;
    try {
      await prisma.stockItem.update({
        where: { id: ids.stock },
        data: { quantity: 2 },
      });
    } catch (error) {
      constraintError = error;
    }

    expect(constraintError).toMatchObject({ code: "SQLITE_CONSTRAINT_CHECK" });

    expect(
      await prisma.stockItem.findUniqueOrThrow({ where: { id: ids.stock } }),
    ).toMatchObject({ quantity: 10, reservedQuantity: 3 });

    await prisma.$transaction(async (tx) => {
      await tx.stockReservation.delete({ where: { id: activeReservation.id } });
      await tx.stockItem.update({
        where: { id: ids.stock },
        data: { reservedQuantity: 0 },
      });
    });
  });

  it.each([
    { quantity: 0, status: "ACTIVE" },
    { quantity: 1, status: "UNKNOWN" },
    { quantity: 1, status: "RELEASED" },
    { quantity: 1, status: "CONSUMED" },
  ])("rejects invalid reservation state: %o", async (reservation) => {
    await expect(
      prisma.stockReservation.create({
        data: {
          orderItemId: ids.orderItem,
          stockItemId: ids.stock,
          ...reservation,
        },
      }),
    ).rejects.toThrow();
  });

  it("accepts valid active, released and consumed reservation lifecycles", async () => {
    const released = await prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { id: ids.stock },
        data: { reservedQuantity: { increment: 3 } },
      });
      return tx.stockReservation.create({
        data: {
          orderItemId: ids.orderItem,
          stockItemId: ids.stock,
          quantity: 3,
        },
      });
    });
    const releasedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { id: ids.stock },
        data: { reservedQuantity: { decrement: 3 } },
      });
      await tx.stockReservation.update({
        where: { id: released.id },
        data: {
          status: "RELEASED",
          releasedAt,
          releaseReason: "TEST_RELEASE",
        },
      });
    });
    expect(
      await prisma.stockReservation.findUniqueOrThrow({
        where: { id: released.id },
      }),
    ).toMatchObject({ status: "RELEASED", releasedAt });

    await prisma.stockReservation.delete({ where: { id: released.id } });
    const consumedAt = new Date();
    const consumed = await prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { id: ids.stock },
        data: { reservedQuantity: { increment: 3 } },
      });
      return tx.stockReservation.create({
        data: {
          orderItemId: ids.orderItem,
          stockItemId: ids.stock,
          quantity: 3,
        },
      });
    });
    await prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { id: ids.stock },
        data: {
          quantity: { decrement: 3 },
          reservedQuantity: { decrement: 3 },
        },
      });
      await tx.stockReservation.update({
        where: { id: consumed.id },
        data: { status: "CONSUMED", consumedAt },
      });
    });
    expect(
      await prisma.stockReservation.findUniqueOrThrow({
        where: { id: consumed.id },
      }),
    ).toMatchObject({ status: "CONSUMED", consumedAt });
    const stock = await prisma.stockItem.findUniqueOrThrow({
      where: { id: ids.stock },
      include: { reservations: true },
    });
    expect(stock.reservedQuantity).toBe(
      stock.reservations
        .filter((reservation) => reservation.status === "ACTIVE")
        .reduce((sum, reservation) => sum + reservation.quantity, 0),
    );
  });
});
