import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { addOrderCartProduct, getOrderCart, submitOrderCart } from "@/data/order-cart";
import { transitionOrderStatus } from "@/data/order-operations";
import type { OrderStatus } from "@/domain/order-transitions";
import { createEmailHandlers } from "@/integrations/email/handlers";
import type { EmailProvider, TransactionalEmail } from "@/integrations/email/types";
import { processOutboxBatch } from "@/integrations/outbox";
import { prisma } from "@/lib/prisma";

const runId = `release-lifecycle-${randomUUID()}`;
const ids = {
  company: `${runId}-company`,
  user: `${runId}-user`,
  address: `${runId}-address`,
  category: `${runId}-category`,
  product: `${runId}-product`,
  priceList: `${runId}-price-list`,
  stock: `${runId}-stock`,
};

const dealer = {
  userId: ids.user,
  companyId: ids.company,
  role: "DEALER_OWNER" as const,
};

describe("release demo: dealer order, stock, shipment, audit and email", () => {
  beforeAll(async () => {
    process.env.EMAIL_PROVIDER = "smtp";
    process.env.EMAIL_FROM = "EkolGlass Release Demo <demo@ekolglass.local>";
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "2525";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_REQUIRE_TLS = "false";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.OUTBOX_CRON_SECRET = "release-lifecycle-outbox-secret-00000001";

    await prisma.company.create({
      data: {
        id: ids.company,
        legalName: "EkolGlass Release Demo Bayi Ltd. Sti.",
        displayName: "Release Demo Bayi",
        email: `${runId}@example.com`,
        phone: "+90 212 000 00 00",
        city: "Istanbul",
        status: "APPROVED",
        paymentTerms: "30 gun vadeli",
        creditPolicy: "UNLIMITED",
      },
    });
    await prisma.user.create({
      data: {
        id: ids.user,
        email: `${runId}-buyer@example.com`,
        name: "Release Demo Musteri",
        role: "DEALER_OWNER",
        status: "ACTIVE",
        companyId: ids.company,
      },
    });
    await prisma.address.create({
      data: {
        id: ids.address,
        companyId: ids.company,
        label: "Demo Teslimat Deposu",
        line1: "Cam Sanayi Caddesi No: 10",
        district: "Basaksehir",
        city: "Istanbul",
        country: "TR",
      },
    });
    await prisma.productCategory.create({
      data: {
        id: ids.category,
        slug: `${runId}-category`,
        name: "Release Demo Camlari",
      },
    });
    await prisma.product.create({
      data: {
        id: ids.product,
        code: "EGL-RELEASE-DEMO",
        name: "Release Demo Lamine On Cam",
        categoryId: ids.category,
        glassType: "Lamine",
        orderMode: "ORDER_ONLY",
        status: "ACTIVE",
      },
    });
    await prisma.priceList.create({
      data: {
        id: ids.priceList,
        name: "Release Demo Bayi Fiyati",
        companyId: ids.company,
        currency: "TRY",
        priority: 100,
      },
    });
    await prisma.productPrice.create({
      data: {
        productId: ids.product,
        priceListId: ids.priceList,
        minQuantity: 1,
        amount: 1250,
      },
    });
    await prisma.stockItem.create({
      data: {
        id: ids.stock,
        productId: ids.product,
        warehouseCode: "RELEASE-DEMO",
        quantity: 10,
        reservedQuantity: 0,
        status: "IN_STOCK",
      },
    });
  });

  afterAll(() => {
    process.env.EMAIL_PROVIDER = "disabled";
    delete process.env.OUTBOX_CRON_SECRET;
  });

  it("proves the complete operational lifecycle", async () => {
    await addOrderCartProduct(dealer, {
      productId: ids.product,
      quantity: 2,
      notes: "Release acceptance order",
    });
    const cart = await getOrderCart(dealer);
    expect(cart).not.toBeNull();

    const submitted = await submitOrderCart(dealer, {
      cartId: cart!.id,
      cartVersion: cart!.version,
      deliveryAddressId: ids.address,
      shipmentMethod: "ROAD",
      idempotencyKey: `${runId}-submit`,
    });
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: submitted.id },
      include: { items: true },
    });
    expect(order).toMatchObject({
      status: "SUBMITTED",
      subtotal: expect.objectContaining({}),
    });
    expect(order.subtotal.toString()).toBe("2500");
    expect(order.items[0]).toMatchObject({
      productId: ids.product,
      quantity: 2,
      productCodeSnapshot: "EGL-RELEASE-DEMO",
    });

    const reservedStock = await prisma.stockItem.findUniqueOrThrow({
      where: { id: ids.stock },
    });
    expect(reservedStock).toMatchObject({ quantity: 10, reservedQuantity: 2 });

    const transitions: OrderStatus[] = [
      "WAITING_FOR_APPROVAL",
      "CONFIRMED",
      "PREPARING",
      "IN_PRODUCTION",
      "READY_FOR_SHIPMENT",
      "SHIPPED",
      "DELIVERED",
    ];
    let currentStatus: OrderStatus = "SUBMITTED";
    let currentVersion = order.version;
    let stockAfterShipment: { quantity: number; reservedQuantity: number } | null = null;

    for (const targetStatus of transitions) {
      const result = await transitionOrderStatus(
        { userId: ids.user, canOverrideCredit: true },
        {
          orderId: order.id,
          expectedStatus: currentStatus,
          expectedVersion: currentVersion,
          targetStatus,
          idempotencyKey: `${runId}-${targetStatus}`,
          note: `Release demo: ${currentStatus} -> ${targetStatus}`,
          ...(targetStatus === "SHIPPED"
            ? { carrier: "Release Demo Lojistik", trackingNumber: "EGL-DEMO-2026" }
            : {}),
        },
      );
      currentStatus = result.status;
      currentVersion = result.version;

      if (targetStatus === "SHIPPED") {
        const stock = await prisma.stockItem.findUniqueOrThrow({
          where: { id: ids.stock },
          select: { quantity: true, reservedQuantity: true },
        });
        stockAfterShipment = stock;
        expect(stock).toEqual({ quantity: 8, reservedQuantity: 0 });
      }
    }

    const deliveredStock = await prisma.stockItem.findUniqueOrThrow({
      where: { id: ids.stock },
      select: { quantity: true, reservedQuantity: true },
    });
    expect(deliveredStock).toEqual(stockAfterShipment);

    const reservation = await prisma.stockReservation.findFirstOrThrow({
      where: { orderItem: { orderId: order.id } },
    });
    expect(reservation).toMatchObject({ quantity: 2, status: "CONSUMED" });
    expect(reservation.consumedAt).toBeInstanceOf(Date);

    expect(
      await prisma.orderStatusHistory.count({ where: { orderId: order.id } }),
    ).toBe(8);
    expect(
      await prisma.auditLog.count({
        where: { entityType: "Order", entityId: order.id },
      }),
    ).toBe(8);
    expect(
      await prisma.stockMovement.findMany({
        where: { sourceId: order.id },
        select: { movementType: true, physicalDelta: true, reservedDelta: true },
        orderBy: { createdAt: "asc" },
      }),
    ).toEqual([
      { movementType: "ORDER_RESERVATION", physicalDelta: 0, reservedDelta: 2 },
      { movementType: "ORDER_CONSUME", physicalDelta: -2, reservedDelta: -2 },
    ]);

    const sent: TransactionalEmail[] = [];
    const provider: EmailProvider = {
      async send(message) {
        sent.push(message);
        return {
          messageId: message.messageId,
          acceptedCount: 1,
          rejectedCount: 0,
        };
      },
    };
    const processed = await processOutboxBatch(createEmailHandlers(provider), {
      workerId: `${runId}-worker`,
      limit: 20,
    });
    expect(processed).toHaveLength(8);
    expect(processed.every((result) => result.status === "SUCCEEDED")).toBe(true);
    expect(sent).toHaveLength(8);
    expect(sent.every((message) => message.to.email === `${runId}-buyer@example.com`)).toBe(true);
    expect(sent.at(-1)?.text).toContain("Teslim Edildi");
    expect(
      await prisma.integrationOutboxEvent.count({
        where: { aggregateId: order.id, status: "SUCCEEDED" },
      }),
    ).toBe(8);
  });
});
