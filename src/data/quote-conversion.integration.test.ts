import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { convertApprovedQuoteToOrder } from "@/data/quote-conversion";
import { QuoteOperationError } from "@/data/quote-operations";
import { prisma } from "@/lib/prisma";

const suffix = Date.now().toString();
const ids = {
  company: `quote-convert-company-${suffix}`,
  dealer: `quote-convert-dealer-${suffix}`,
  actor: `quote-convert-actor-${suffix}`,
  address: `quote-convert-address-${suffix}`,
  category: `quote-convert-category-${suffix}`,
  product: `quote-convert-product-${suffix}`,
  stockA: `quote-convert-stock-a-${suffix}`,
  stockB: `quote-convert-stock-b-${suffix}`,
};
const quoteIds: string[] = [];

async function createApprovedQuote(quantity: number, validUntil?: Date) {
  const quote = await prisma.quoteRequest.create({
    data: {
      quoteNumber: `CONV-${crypto.randomUUID()}`,
      companyId: ids.company,
      requesterUserId: ids.dealer,
      requesterName: "Dealer User",
      requesterEmail: `dealer-${suffix}@example.com`,
      desiredDeliveryDate: new Date("2026-08-15T12:00:00.000Z"),
      status: "APPROVED",
      currency: "TRY",
      submittedAt: new Date(),
      items: {
        create: {
          productId: ids.product,
          quantity,
          dimensions: "1200x800",
          glassType: "Lamine",
          notes: "Quote item note",
        },
      },
    },
    include: { items: true },
  });
  quoteIds.push(quote.id);
  const revision = await prisma.quoteOfferRevision.create({
    data: {
      quoteId: quote.id,
      revisionNumber: 1,
      currency: "EUR",
      subtotal: 25 * quantity,
      validUntil,
      createdById: ids.actor,
      items: {
        create: {
          quoteRequestItemId: quote.items[0]!.id,
          quantitySnapshot: quantity,
          unitPrice: 25,
          lineTotal: 25 * quantity,
          productCodeSnapshot: "OFFER-CODE",
          productNameSnapshot: "Offer Product Snapshot",
          dimensionsSnapshot: "1200x800",
          glassTypeSnapshot: "Lamine",
        },
      },
    },
  });
  return prisma.quoteRequest.update({
    where: { id: quote.id },
    data: { activeOfferRevisionId: revision.id },
    select: { id: true, version: true, activeOfferRevisionId: true },
  });
}

describe("approved quote to order conversion", () => {
  beforeAll(async () => {
    await prisma.company.create({
      data: {
        id: ids.company,
        legalName: "Quote Conversion Company",
        displayName: "Conversion Company",
        email: `company-${suffix}@example.com`,
        phone: "1",
        city: "Istanbul",
        status: "APPROVED",
      },
    });
    await prisma.user.createMany({
      data: [
        { id: ids.dealer, email: `dealer-${suffix}@example.com`, name: "Dealer User", role: "DEALER_OWNER", status: "ACTIVE", companyId: ids.company },
        { id: ids.actor, email: `actor-${suffix}@example.com`, name: "Sales Manager", role: "SALES_MANAGER", status: "ACTIVE" },
      ],
    });
    await prisma.address.create({
      data: { id: ids.address, companyId: ids.company, label: "Factory", line1: "Test Street 1", district: "Tuzla", city: "Istanbul", country: "TR", isDefault: true },
    });
    await prisma.productCategory.create({ data: { id: ids.category, slug: `quote-convert-${suffix}`, name: "Quote Conversion" } });
    await prisma.product.create({ data: { id: ids.product, code: "CURRENT-CODE", name: "Current Product", categoryId: ids.category, glassType: "Lamine", orderMode: "QUOTE_ONLY", status: "ACTIVE" } });
    await prisma.stockItem.createMany({
      data: [
        { id: ids.stockA, productId: ids.product, warehouseCode: "A", quantity: 4, reservedQuantity: 0 },
        { id: ids.stockB, productId: ids.product, warehouseCode: "B", quantity: 5, reservedQuantity: 0 },
      ],
    });
  });

  afterAll(async () => {
    const orders = await prisma.order.findMany({ where: { companyId: ids.company }, select: { id: true } });
    const orderIds = orders.map((order) => order.id);
    await prisma.integrationOutboxEvent.deleteMany({
      where: {
        aggregateId: { in: [...quoteIds, ...orderIds] },
      },
    });
    await prisma.quoteOperationCommand.deleteMany({ where: { quoteId: { in: quoteIds } } });
    await prisma.orderTransitionCommand.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.stockReservation.deleteMany({ where: { orderItem: { orderId: { in: orderIds } } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.quoteRequest.updateMany({ where: { id: { in: quoteIds } }, data: { activeOfferRevisionId: null } });
    await prisma.quoteOfferRevisionItem.deleteMany({ where: { revision: { quoteId: { in: quoteIds } } } });
    await prisma.quoteOfferRevision.deleteMany({ where: { quoteId: { in: quoteIds } } });
    await prisma.quoteStatusHistory.deleteMany({ where: { quoteId: { in: quoteIds } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: ids.actor } });
    await prisma.quoteRequest.deleteMany({ where: { id: { in: quoteIds } } });
    await prisma.stockItem.deleteMany({ where: { productId: ids.product } });
    await prisma.product.delete({ where: { id: ids.product } });
    await prisma.productCategory.delete({ where: { id: ids.category } });
    await prisma.address.deleteMany({ where: { companyId: ids.company } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.dealer, ids.actor] } } });
    await prisma.company.delete({ where: { id: ids.company } });
  });

  it("creates one order from the immutable revision and replays safely", async () => {
    const quote = await createApprovedQuote(7, new Date("2027-01-01T00:00:00.000Z"));
    const input = {
      quoteId: quote.id,
      expectedVersion: quote.version,
      expectedOfferRevisionId: quote.activeOfferRevisionId!,
      deliveryAddressId: ids.address,
      shipmentMethod: "CITY_LOJISTIK" as const,
      notes: "Conversion note",
      idempotencyKey: crypto.randomUUID(),
    };

    const first = await convertApprovedQuoteToOrder({ userId: ids.actor }, input);
    const replay = await convertApprovedQuoteToOrder({ userId: ids.actor }, input);
    expect(replay).toEqual({ id: first.id, replayed: true });
    expect(
      await prisma.integrationOutboxEvent.count({
        where: { aggregateId: { in: [quote.id, first.id] } },
      }),
    ).toBe(2);
    await expect(convertApprovedQuoteToOrder({ userId: ids.actor }, { ...input, notes: "Different note" })).rejects.toMatchObject({ code: "CONFLICT" } satisfies Partial<QuoteOperationError>);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: first.id },
      include: { items: { include: { reservations: true } }, statusHistory: true, quoteConversionCommand: true },
    });
    expect(order).toMatchObject({ companyId: ids.company, status: "SUBMITTED", currency: "EUR", sourceQuoteId: quote.id, sourceQuoteVersion: 1, sourceOfferRevisionId: quote.activeOfferRevisionId });
    expect(order.subtotal.toString()).toBe("175");
    expect(order.requestedDeliveryDate?.toISOString()).toBe("2026-08-15T12:00:00.000Z");
    expect(order.items[0]).toMatchObject({ quantity: 7, productCodeSnapshot: "OFFER-CODE", productNameSnapshot: "Offer Product Snapshot", priceScope: "QUOTE_REVISION" });
    expect(order.items[0]!.reservations.map((item) => item.quantity).sort()).toEqual([3, 4]);
    expect(order.statusHistory).toHaveLength(1);
    expect(order.quoteConversionCommand?.resultOrderId).toBe(order.id);
    expect(await prisma.order.count({ where: { sourceQuoteId: quote.id } })).toBe(1);

    const persistedQuote = await prisma.quoteRequest.findUniqueOrThrow({ where: { id: quote.id }, include: { statusHistory: true } });
    expect(persistedQuote).toMatchObject({ status: "CONVERTED_TO_ORDER", version: 2 });
    expect(persistedQuote.statusHistory).toHaveLength(1);
    expect((await prisma.stockItem.findUniqueOrThrow({ where: { id: ids.stockA } })).reservedQuantity).toBe(4);
    expect((await prisma.stockItem.findUniqueOrThrow({ where: { id: ids.stockB } })).reservedQuantity).toBe(3);
    expect(await prisma.stockMovement.findMany({
      where: { sourceType: "QUOTE_CONVERSION_ORDER", sourceId: order.id },
      orderBy: { stockItemId: "asc" },
      select: { movementType: true, physicalDelta: true, reservedDelta: true },
    })).toEqual([
      { movementType: "ORDER_RESERVATION", physicalDelta: 0, reservedDelta: 4 },
      { movementType: "ORDER_RESERVATION", physicalDelta: 0, reservedDelta: 3 },
    ]);

    await expect(convertApprovedQuoteToOrder({ userId: ids.actor }, { ...input, idempotencyKey: crypto.randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" } satisfies Partial<QuoteOperationError>);
  });

  it("rolls back completely when stock is insufficient", async () => {
    const quote = await createApprovedQuote(10);
    const beforeOrders = await prisma.order.count({ where: { companyId: ids.company } });
    const beforeReserved = await prisma.stockItem.aggregate({ where: { productId: ids.product }, _sum: { reservedQuantity: true } });

    await expect(convertApprovedQuoteToOrder({ userId: ids.actor }, {
      quoteId: quote.id,
      expectedVersion: quote.version,
      expectedOfferRevisionId: quote.activeOfferRevisionId!,
      deliveryAddressId: ids.address,
      shipmentMethod: "SALES_COORDINATION",
      idempotencyKey: crypto.randomUUID(),
    })).rejects.toMatchObject({ code: "INVALID_CONVERSION" } satisfies Partial<QuoteOperationError>);

    expect(await prisma.order.count({ where: { companyId: ids.company } })).toBe(beforeOrders);
    expect((await prisma.stockItem.aggregate({ where: { productId: ids.product }, _sum: { reservedQuantity: true } }))._sum.reservedQuantity).toBe(beforeReserved._sum.reservedQuantity);
    expect(await prisma.quoteRequest.findUniqueOrThrow({ where: { id: quote.id } })).toMatchObject({ status: "APPROVED", version: 1 });
  });

  it("rejects expired revisions before creating an order", async () => {
    const quote = await createApprovedQuote(1, new Date("2020-01-01T00:00:00.000Z"));
    await expect(convertApprovedQuoteToOrder({ userId: ids.actor }, {
      quoteId: quote.id,
      expectedVersion: quote.version,
      expectedOfferRevisionId: quote.activeOfferRevisionId!,
      deliveryAddressId: ids.address,
      shipmentMethod: "CUSTOMER_PICKUP",
      idempotencyKey: crypto.randomUUID(),
    })).rejects.toMatchObject({ code: "INVALID_CONVERSION" } satisfies Partial<QuoteOperationError>);
    expect(await prisma.order.count({ where: { sourceQuoteId: quote.id } })).toBe(0);
    expect(await prisma.stockMovement.count({ where: { sourceType: "QUOTE_CONVERSION_ORDER", sourceId: quote.id } })).toBe(0);
  });
});
