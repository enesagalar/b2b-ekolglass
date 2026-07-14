import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDealerDashboardData, getDealerOrders, getDealerQuotes } from "@/data/dealer-portal";
import { prisma } from "@/lib/prisma";

const suffix = Date.now().toString();
const companyAId = `dealer-portal-company-a-${suffix}`;
const companyBId = `dealer-portal-company-b-${suffix}`;
const orderAId = `dealer-portal-order-a-${suffix}`;
const orderBId = `dealer-portal-order-b-${suffix}`;
const deliveredOrderId = `dealer-portal-order-delivered-${suffix}`;
const cancelledOrderId = `dealer-portal-order-cancelled-${suffix}`;
const quoteAId = `dealer-portal-quote-a-${suffix}`;
const quoteBId = `dealer-portal-quote-b-${suffix}`;

describe("dealer portal tenant isolation", () => {
  beforeAll(async () => {
    await prisma.company.createMany({
      data: [
        {
          id: companyAId,
          legalName: "Dealer Portal Test A",
          displayName: "Portal A",
          email: `portal-a-${suffix}@example.com`,
          phone: "+90 212 000 00 01",
          city: "Istanbul",
          status: "APPROVED",
        },
        {
          id: companyBId,
          legalName: "Dealer Portal Test B",
          displayName: "Portal B",
          email: `portal-b-${suffix}@example.com`,
          phone: "+90 212 000 00 02",
          city: "Ankara",
          status: "APPROVED",
        },
      ],
    });

    await prisma.order.createMany({
      data: [
        { id: orderAId, orderNumber: `PORTAL-A-${suffix}`, companyId: companyAId, status: "CONFIRMED", createdAt: new Date("2026-01-10T10:00:00.000Z") },
        { id: deliveredOrderId, orderNumber: `HISTORY-DELIVERED-${suffix}`, companyId: companyAId, status: "DELIVERED", createdAt: new Date("2026-02-15T10:00:00.000Z") },
        { id: cancelledOrderId, orderNumber: `HISTORY-CANCELLED-${suffix}`, companyId: companyAId, status: "CANCELLED", createdAt: new Date("2026-03-20T10:00:00.000Z") },
        { id: orderBId, orderNumber: `HISTORY-DELIVERED-${suffix}-OTHER`, companyId: companyBId, status: "DELIVERED", createdAt: new Date("2026-02-15T10:00:00.000Z") },
      ],
    });

    await prisma.quoteRequest.createMany({
      data: [
        {
          id: quoteAId,
          quoteNumber: `QUOTE-A-${suffix}`,
          companyId: companyAId,
          requesterName: "Portal A",
          requesterEmail: `portal-a-${suffix}@example.com`,
          status: "NEW",
        },
        {
          id: quoteBId,
          quoteNumber: `QUOTE-B-${suffix}`,
          companyId: companyBId,
          requesterName: "Portal B",
          requesterEmail: `portal-b-${suffix}@example.com`,
          status: "NEW",
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.quoteRequest.deleteMany({ where: { id: { in: [quoteAId, quoteBId] } } });
    await prisma.order.deleteMany({ where: { id: { in: [orderAId, deliveredOrderId, cancelledOrderId, orderBId] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
  });

  it("returns only records owned by the requested company", async () => {
    const [orderData, quotes, dashboard] = await Promise.all([
      getDealerOrders(companyAId),
      getDealerQuotes(companyAId),
      getDealerDashboardData(companyAId),
    ]);

    expect(orderData.orders.map((order) => order.id)).toEqual([
      cancelledOrderId,
      deliveredOrderId,
      orderAId,
    ]);
    expect(orderData.total).toBe(3);
    expect(quotes.map((quote) => quote.id)).toEqual([quoteAId]);
    expect(dashboard.recentOrders.map((order) => order.id)).toEqual([
      cancelledOrderId,
      deliveredOrderId,
      orderAId,
    ]);
    expect(dashboard.recentQuotes.map((quote) => quote.id)).toEqual([quoteAId]);
    expect(dashboard.openOrders).toBe(1);
    expect(dashboard.openQuotes).toBe(1);
  });

  it("filters order history without leaking another company's matching orders", async () => {
    const result = await getDealerOrders(companyAId, {
      query: "HISTORY-DELIVERED",
      status: "DELIVERED",
      dateFrom: new Date("2026-02-01T00:00:00.000Z"),
      dateTo: new Date("2026-03-01T00:00:00.000Z"),
      page: 1,
      pageSize: 10,
    });

    expect(result.orders.map((order) => order.id)).toEqual([deliveredOrderId]);
    expect(result.total).toBe(1);
  });

  it("accepts operational statuses, ignores unknown statuses and bounds pagination", async () => {
    const result = await getDealerOrders(companyAId, {
      status: "CONFIRMED",
      pageSize: 500,
      page: 999,
    });

    expect(result.total).toBe(1);
    expect(result.pageSize).toBe(100);
    expect(result.page).toBe(1);
    expect(result.orders.map((order) => order.id)).toEqual([orderAId]);

    const invalidStatus = await getDealerOrders(companyAId, { status: "FORGED" });
    expect(invalidStatus.total).toBe(3);
  });
});
