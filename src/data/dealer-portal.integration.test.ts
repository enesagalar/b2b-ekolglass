import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDealerDashboardData, getDealerOrders, getDealerQuotes } from "@/data/dealer-portal";
import { prisma } from "@/lib/prisma";

const suffix = Date.now().toString();
const companyAId = `dealer-portal-company-a-${suffix}`;
const companyBId = `dealer-portal-company-b-${suffix}`;
const orderAId = `dealer-portal-order-a-${suffix}`;
const orderBId = `dealer-portal-order-b-${suffix}`;
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
        { id: orderAId, orderNumber: `PORTAL-A-${suffix}`, companyId: companyAId, status: "CONFIRMED" },
        { id: orderBId, orderNumber: `PORTAL-B-${suffix}`, companyId: companyBId, status: "CONFIRMED" },
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
    await prisma.order.deleteMany({ where: { id: { in: [orderAId, orderBId] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
  });

  it("returns only records owned by the requested company", async () => {
    const [orders, quotes, dashboard] = await Promise.all([
      getDealerOrders(companyAId),
      getDealerQuotes(companyAId),
      getDealerDashboardData(companyAId),
    ]);

    expect(orders.map((order) => order.id)).toEqual([orderAId]);
    expect(quotes.map((quote) => quote.id)).toEqual([quoteAId]);
    expect(dashboard.recentOrders.map((order) => order.id)).toEqual([orderAId]);
    expect(dashboard.recentQuotes.map((quote) => quote.id)).toEqual([quoteAId]);
    expect(dashboard.openOrders).toBe(1);
    expect(dashboard.openQuotes).toBe(1);
  });
});
