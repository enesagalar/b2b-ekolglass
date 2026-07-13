import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  addOrderCartProduct,
  removeOrderCartProduct,
  submitOrderCart,
  updateOrderCartProduct,
} from "@/data/order-cart";
import { prisma } from "@/lib/prisma";

const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const ids = {
  companyA: `order-cart-company-a-${suffix}`,
  companyB: `order-cart-company-b-${suffix}`,
  userA: `order-cart-user-a-${suffix}`,
  userB: `order-cart-user-b-${suffix}`,
  addressA: `order-cart-address-a-${suffix}`,
  addressB: `order-cart-address-b-${suffix}`,
  category: `order-cart-category-${suffix}`,
  tierProduct: `order-cart-tier-product-${suffix}`,
  quoteOnlyProduct: `order-cart-quote-product-${suffix}`,
  mutableProduct: `order-cart-mutable-product-${suffix}`,
  insufficientProduct: `order-cart-insufficient-product-${suffix}`,
  companyList: `order-cart-company-list-${suffix}`,
  tierStockA: `order-cart-tier-stock-a-${suffix}`,
  tierStockB: `order-cart-tier-stock-b-${suffix}`,
  mutableStock: `order-cart-mutable-stock-${suffix}`,
  insufficientStock: `order-cart-insufficient-stock-${suffix}`,
};

const productIds = [
  ids.tierProduct,
  ids.quoteOnlyProduct,
  ids.mutableProduct,
  ids.insufficientProduct,
];
const companyIds = [ids.companyA, ids.companyB];
const userIds = [ids.userA, ids.userB];
const actorA = {
  userId: ids.userA,
  companyId: ids.companyA,
  role: "DEALER_OWNER" as const,
};
const actorB = {
  userId: ids.userB,
  companyId: ids.companyB,
  role: "DEALER_OWNER" as const,
};

async function clearRuntimeRecords() {
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.stockReservation.deleteMany({
    where: { orderItem: { order: { companyId: { in: companyIds } } } },
  });
  await prisma.order.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.orderCart.deleteMany({
    where: { companyId: { in: companyIds } },
  });
}

async function restoreMutableFixtures() {
  await prisma.product.update({
    where: { id: ids.tierProduct },
    data: {
      code: `OC-TIER-${suffix}`,
      name: "Server Tier Product",
      orderMode: "QUOTE_OR_ORDER",
    },
  });
  await prisma.product.update({
    where: { id: ids.mutableProduct },
    data: { orderMode: "QUOTE_OR_ORDER" },
  });
  await prisma.address.update({
    where: { id: ids.addressA },
    data: {
      label: "Main Warehouse",
      line1: "Glass Street 10",
      line2: "Floor 2",
      district: "Pendik",
      city: "Istanbul",
      country: "TR",
      postalCode: "34900",
    },
  });
  await prisma.stockItem.update({
    where: { id: ids.tierStockA },
    data: { quantity: 4, reservedQuantity: 1, status: "LOW_STOCK" },
  });
  await prisma.stockItem.update({
    where: { id: ids.tierStockB },
    data: { quantity: 10, reservedQuantity: 2, status: "IN_STOCK" },
  });
  await prisma.stockItem.update({
    where: { id: ids.mutableStock },
    data: { quantity: 5, reservedQuantity: 0, status: "IN_STOCK" },
  });
  await prisma.stockItem.update({
    where: { id: ids.insufficientStock },
    data: { quantity: 2, reservedQuantity: 1, status: "LOW_STOCK" },
  });
}

describe("order cart submission and tenant isolation", () => {
  beforeAll(async () => {
    await prisma.company.createMany({
      data: [
        {
          id: ids.companyA,
          legalName: "Order Cart A",
          displayName: "Order A",
          email: `oca-${suffix}@example.com`,
          phone: "1",
          city: "Istanbul",
          status: "APPROVED",
        },
        {
          id: ids.companyB,
          legalName: "Order Cart B",
          displayName: "Order B",
          email: `ocb-${suffix}@example.com`,
          phone: "2",
          city: "Ankara",
          status: "APPROVED",
        },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: ids.userA,
          email: `order-user-a-${suffix}@example.com`,
          name: "Order User A",
          role: "DEALER_OWNER",
          status: "ACTIVE",
          companyId: ids.companyA,
        },
        {
          id: ids.userB,
          email: `order-user-b-${suffix}@example.com`,
          name: "Order User B",
          role: "DEALER_OWNER",
          status: "ACTIVE",
          companyId: ids.companyB,
        },
      ],
    });
    await prisma.address.createMany({
      data: [
        {
          id: ids.addressA,
          companyId: ids.companyA,
          label: "Main Warehouse",
          line1: "Glass Street 10",
          line2: "Floor 2",
          district: "Pendik",
          city: "Istanbul",
          country: "TR",
          postalCode: "34900",
        },
        {
          id: ids.addressB,
          companyId: ids.companyB,
          label: "Foreign Address",
          line1: "Other Street 20",
          city: "Ankara",
          country: "TR",
        },
      ],
    });
    await prisma.productCategory.create({
      data: {
        id: ids.category,
        slug: `order-cart-${suffix}`,
        name: "Order Cart Test",
      },
    });
    await prisma.product.createMany({
      data: [
        {
          id: ids.tierProduct,
          code: `OC-TIER-${suffix}`,
          name: "Server Tier Product",
          categoryId: ids.category,
          glassType: "Lamine",
          orderMode: "QUOTE_OR_ORDER",
          status: "ACTIVE",
        },
        {
          id: ids.quoteOnlyProduct,
          code: `OC-QUOTE-${suffix}`,
          name: "Quote Only Product",
          categoryId: ids.category,
          glassType: "Lamine",
          orderMode: "QUOTE_ONLY",
          status: "ACTIVE",
        },
        {
          id: ids.mutableProduct,
          code: `OC-MUTABLE-${suffix}`,
          name: "Mutable Product",
          categoryId: ids.category,
          glassType: "Temperli",
          orderMode: "QUOTE_OR_ORDER",
          status: "ACTIVE",
        },
        {
          id: ids.insufficientProduct,
          code: `OC-LOW-${suffix}`,
          name: "Insufficient Product",
          categoryId: ids.category,
          glassType: "Temperli",
          orderMode: "ORDER_ONLY",
          status: "ACTIVE",
        },
      ],
    });
    await prisma.priceList.create({
      data: {
        id: ids.companyList,
        name: "Order Cart Company Price",
        companyId: ids.companyA,
        currency: "TRY",
        priority: 10,
      },
    });
    await prisma.productPrice.createMany({
      data: [
        {
          productId: ids.tierProduct,
          priceListId: ids.companyList,
          minQuantity: 1,
          amount: 120,
        },
        {
          productId: ids.tierProduct,
          priceListId: ids.companyList,
          minQuantity: 10,
          amount: 80,
        },
        {
          productId: ids.mutableProduct,
          priceListId: ids.companyList,
          minQuantity: 1,
          amount: 50,
        },
        {
          productId: ids.insufficientProduct,
          priceListId: ids.companyList,
          minQuantity: 1,
          amount: 25,
        },
      ],
    });
    await prisma.stockItem.createMany({
      data: [
        {
          id: ids.tierStockA,
          productId: ids.tierProduct,
          warehouseCode: `A-${suffix}`,
          quantity: 4,
          reservedQuantity: 1,
          status: "LOW_STOCK",
        },
        {
          id: ids.tierStockB,
          productId: ids.tierProduct,
          warehouseCode: `B-${suffix}`,
          quantity: 10,
          reservedQuantity: 2,
          status: "IN_STOCK",
        },
        {
          id: ids.mutableStock,
          productId: ids.mutableProduct,
          warehouseCode: `M-${suffix}`,
          quantity: 5,
          reservedQuantity: 0,
          status: "IN_STOCK",
        },
        {
          id: ids.insufficientStock,
          productId: ids.insufficientProduct,
          warehouseCode: `Z-${suffix}`,
          quantity: 2,
          reservedQuantity: 1,
          status: "LOW_STOCK",
        },
      ],
    });
  });

  beforeEach(async () => {
    await clearRuntimeRecords();
    await restoreMutableFixtures();
  });

  afterAll(async () => {
    await clearRuntimeRecords();
    await prisma.stockItem.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.productPrice.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.priceList.deleteMany({ where: { id: ids.companyList } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.productCategory.deleteMany({ where: { id: ids.category } });
    await prisma.address.deleteMany({
      where: { id: { in: [ids.addressA, ids.addressB] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
  });

  it("blocks cross-company item updates and removals and rejects quote-only products", async () => {
    const item = await addOrderCartProduct(actorA, {
      productId: ids.tierProduct,
      quantity: 1,
      notes: "Original",
    });

    await expect(
      updateOrderCartProduct(actorB, {
        itemId: item.id,
        quantity: 7,
        notes: "Forged",
      }),
    ).rejects.toThrow();
    await expect(removeOrderCartProduct(actorB, item.id)).rejects.toThrow();
    await expect(
      addOrderCartProduct(actorA, {
        productId: ids.quoteOnlyProduct,
        quantity: 1,
      }),
    ).rejects.toThrow();

    const persisted = await prisma.orderCartItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(persisted.quantity).toBe(1);
    expect(persisted.notes).toBe("Original");
    expect(
      await prisma.orderCartItem.count({
        where: { productId: ids.quoteOnlyProduct },
      }),
    ).toBe(0);
  });

  it("rechecks order mode at submission and enforces delivery-address ownership", async () => {
    await addOrderCartProduct(actorA, {
      productId: ids.mutableProduct,
      quantity: 1,
    });
    const mutableCart = await prisma.orderCart.findUniqueOrThrow({
      where: {
        companyId_ownerUserId: {
          companyId: ids.companyA,
          ownerUserId: ids.userA,
        },
      },
    });
    await prisma.product.update({
      where: { id: ids.mutableProduct },
      data: { orderMode: "QUOTE_ONLY" },
    });

    await expect(
      submitOrderCart(actorA, {
        cartId: mutableCart.id,
        cartVersion: mutableCart.version,
        deliveryAddressId: ids.addressA,
        shipmentMethod: "ROAD",
        idempotencyKey: `mode-${suffix}`,
      }),
    ).rejects.toThrow();

    await prisma.product.update({
      where: { id: ids.mutableProduct },
      data: { orderMode: "QUOTE_OR_ORDER" },
    });
    await expect(
      submitOrderCart(actorA, {
        cartId: mutableCart.id,
        cartVersion: mutableCart.version,
        deliveryAddressId: ids.addressB,
        shipmentMethod: "ROAD",
        idempotencyKey: `address-${suffix}`,
      }),
    ).rejects.toThrow();

    expect(
      await prisma.order.count({ where: { companyId: ids.companyA } }),
    ).toBe(0);
    expect(
      await prisma.orderCart.count({
        where: { companyId: ids.companyA, ownerUserId: ids.userA },
      }),
    ).toBe(1);
    expect(
      (
        await prisma.stockItem.findUniqueOrThrow({
          where: { id: ids.mutableStock },
        })
      ).reservedQuantity,
    ).toBe(0);
  });

  it("snapshots server-side tier pricing, product, and address data while reserving across stock rows idempotently", async () => {
    await addOrderCartProduct(actorA, {
      productId: ids.tierProduct,
      quantity: 10,
      notes: "Handle carefully",
    });
    const successCart = await prisma.orderCart.findUniqueOrThrow({
      where: {
        companyId_ownerUserId: {
          companyId: ids.companyA,
          ownerUserId: ids.userA,
        },
      },
    });
    const idempotencyKey = `success-${suffix}`;

    const first = await submitOrderCart(actorA, {
      cartId: successCart.id,
      cartVersion: successCart.version,
      deliveryAddressId: ids.addressA,
      shipmentMethod: "ROAD",
      notes: "Deliver weekday mornings",
      idempotencyKey,
    });
    const replay = await submitOrderCart(actorA, {
      cartId: successCart.id,
      cartVersion: successCart.version,
      deliveryAddressId: ids.addressA,
      shipmentMethod: "ROAD",
      notes: "Deliver weekday mornings",
      idempotencyKey,
    });

    expect(replay.id).toBe(first.id);
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: first.id },
      include: { items: true },
    });
    expect(order.companyId).toBe(ids.companyA);
    expect(order.createdById).toBe(ids.userA);
    expect(order.currency).toBe("TRY");
    expect(order.subtotal.toString()).toBe("800");
    expect(order.deliveryAddressId).toBe(ids.addressA);
    expect(order.deliveryLabel).toBe("Main Warehouse");
    expect(order.deliveryLine1).toBe("Glass Street 10");
    expect(order.deliveryLine2).toBe("Floor 2");
    expect(order.deliveryDistrict).toBe("Pendik");
    expect(order.deliveryCity).toBe("Istanbul");
    expect(order.deliveryCountry).toBe("TR");
    expect(order.deliveryPostalCode).toBe("34900");
    expect(order.shipmentMethod).toBe("ROAD");
    expect(order.notes).toBe("Deliver weekday mornings");
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      productId: ids.tierProduct,
      quantity: 10,
      productCodeSnapshot: `OC-TIER-${suffix}`,
      productNameSnapshot: "Server Tier Product",
      priceListId: ids.companyList,
      priceMinQuantity: 10,
      priceScope: "COMPANY",
      notes: "Handle carefully",
    });
    expect(order.items[0]?.unitPrice?.toString()).toBe("80");
    expect(order.items[0]?.lineTotal?.toString()).toBe("800");

    const reservations = await prisma.stockReservation.findMany({
      where: { orderItem: { orderId: order.id } },
      orderBy: { stockItemId: "asc" },
    });
    expect(
      reservations.map(({ stockItemId, quantity, status }) => ({
        stockItemId,
        quantity,
        status,
      })),
    ).toEqual([
      { stockItemId: ids.tierStockA, quantity: 3, status: "ACTIVE" },
      { stockItemId: ids.tierStockB, quantity: 7, status: "ACTIVE" },
    ]);
    expect(
      (
        await prisma.stockItem.findUniqueOrThrow({
          where: { id: ids.tierStockA },
        })
      ).reservedQuantity,
    ).toBe(4);
    expect(
      (
        await prisma.stockItem.findUniqueOrThrow({
          where: { id: ids.tierStockB },
        })
      ).reservedQuantity,
    ).toBe(9);
    expect(
      await prisma.orderCart.count({
        where: { companyId: ids.companyA, ownerUserId: ids.userA },
      }),
    ).toBe(0);
    expect(await prisma.order.count({ where: { idempotencyKey } })).toBe(1);
    expect(
      await prisma.stockReservation.count({
        where: { orderItem: { orderId: order.id } },
      }),
    ).toBe(2);
    expect(
      await prisma.orderStatusHistory.count({ where: { orderId: order.id } }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { entityType: "Order", entityId: order.id },
      }),
    ).toBe(1);

    await prisma.product.update({
      where: { id: ids.tierProduct },
      data: { code: `CHANGED-${suffix}`, name: "Changed Product" },
    });
    await prisma.address.update({
      where: { id: ids.addressA },
      data: {
        label: "Changed Address",
        line1: "Changed Street",
        city: "Izmir",
      },
    });
    const persistedSnapshot = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(persistedSnapshot.deliveryLabel).toBe("Main Warehouse");
    expect(persistedSnapshot.deliveryLine1).toBe("Glass Street 10");
    expect(persistedSnapshot.deliveryCity).toBe("Istanbul");
    expect(persistedSnapshot.items[0]?.productCodeSnapshot).toBe(
      `OC-TIER-${suffix}`,
    );
    expect(persistedSnapshot.items[0]?.productNameSnapshot).toBe(
      "Server Tier Product",
    );
  });

  it("rolls back the order and all stock changes when any cart item has insufficient stock", async () => {
    await addOrderCartProduct(actorA, {
      productId: ids.tierProduct,
      quantity: 1,
    });
    await addOrderCartProduct(actorA, {
      productId: ids.insufficientProduct,
      quantity: 2,
    });
    const idempotencyKey = `insufficient-${suffix}`;
    const rollbackCart = await prisma.orderCart.findUniqueOrThrow({
      where: {
        companyId_ownerUserId: {
          companyId: ids.companyA,
          ownerUserId: ids.userA,
        },
      },
    });

    const stockBefore = await prisma.stockItem.findMany({
      where: {
        id: { in: [ids.tierStockA, ids.tierStockB, ids.insufficientStock] },
      },
      orderBy: { id: "asc" },
      select: { id: true, reservedQuantity: true },
    });
    await expect(
      submitOrderCart(actorA, {
        cartId: rollbackCart.id,
        cartVersion: rollbackCart.version,
        deliveryAddressId: ids.addressA,
        shipmentMethod: "ROAD",
        idempotencyKey,
      }),
    ).rejects.toThrow();

    const stockAfter = await prisma.stockItem.findMany({
      where: {
        id: { in: [ids.tierStockA, ids.tierStockB, ids.insufficientStock] },
      },
      orderBy: { id: "asc" },
      select: { id: true, reservedQuantity: true },
    });
    expect(stockAfter).toEqual(stockBefore);
    expect(await prisma.order.count({ where: { idempotencyKey } })).toBe(0);
    expect(
      await prisma.stockReservation.count({
        where: {
          stockItemId: {
            in: [ids.tierStockA, ids.tierStockB, ids.insufficientStock],
          },
        },
      }),
    ).toBe(0);
    expect(
      await prisma.orderCart.count({
        where: { companyId: ids.companyA, ownerUserId: ids.userA },
      }),
    ).toBe(1);
    expect(
      await prisma.orderCartItem.count({
        where: { cart: { companyId: ids.companyA, ownerUserId: ids.userA } },
      }),
    ).toBe(2);
  });
});
