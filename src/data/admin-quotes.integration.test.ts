import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAdminQuotes } from "@/data/admin-quotes";
import { prisma } from "@/lib/prisma";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const companyId = `admin-quote-archive-company-${suffix}`;
const newQuoteId = `admin-quote-archive-new-${suffix}`;
const waitingQuoteId = `admin-quote-archive-waiting-${suffix}`;
const offeredQuoteId = `admin-quote-archive-offered-${suffix}`;
const convertedQuoteId = `admin-quote-archive-converted-${suffix}`;
const cancelledQuoteId = `admin-quote-archive-cancelled-${suffix}`;
const convertedOrderId = `admin-quote-archive-order-${suffix}`;
const quoteIds = [
  newQuoteId,
  waitingQuoteId,
  offeredQuoteId,
  convertedQuoteId,
  cancelledQuoteId,
];

describe("admin quote archive filters with SQLite", () => {
  beforeAll(async () => {
    await prisma.company.create({
      data: {
        id: companyId,
        legalName: "Quote Archive Test Ltd.",
        displayName: `Quote Archive Test ${suffix}`,
        email: `quote-archive-${suffix}@example.com`,
        phone: "+90 212 000 00 00",
        city: "Istanbul",
        status: "APPROVED",
      },
    });
    await prisma.quoteRequest.createMany({
      data: [
        {
          id: newQuoteId,
          quoteNumber: `QUOTE-NEW-${suffix}`,
          companyId,
          requesterName: "Archive User",
          requesterEmail: `archive-${suffix}@example.com`,
          status: "NEW",
          estimatedSubtotal: 100,
        },
        {
          id: waitingQuoteId,
          quoteNumber: `QUOTE-WAITING-${suffix}`,
          companyId,
          requesterName: "Archive User",
          requesterEmail: `archive-${suffix}@example.com`,
          status: "WAITING_FOR_CUSTOMER_INFO",
          estimatedSubtotal: 200,
        },
        {
          id: offeredQuoteId,
          quoteNumber: `QUOTE-OFFERED-${suffix}`,
          companyId,
          requesterName: "Archive User",
          requesterEmail: `archive-${suffix}@example.com`,
          status: "OFFER_SENT",
          estimatedSubtotal: 300,
        },
        {
          id: convertedQuoteId,
          quoteNumber: `QUOTE-CONVERTED-${suffix}`,
          companyId,
          requesterName: "Archive User",
          requesterEmail: `archive-${suffix}@example.com`,
          status: "CONVERTED_TO_ORDER",
          estimatedSubtotal: 400,
        },
        {
          id: cancelledQuoteId,
          quoteNumber: `QUOTE-CANCELLED-${suffix}`,
          companyId,
          requesterName: "Archive User",
          requesterEmail: `archive-${suffix}@example.com`,
          status: "CANCELLED",
          estimatedSubtotal: 500,
        },
      ],
    });
    await prisma.order.create({
      data: {
        id: convertedOrderId,
        orderNumber: `ORDER-FROM-QUOTE-${suffix}`,
        companyId,
        status: "CONFIRMED",
        sourceQuoteId: convertedQuoteId,
      },
    });
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: convertedOrderId } });
    await prisma.quoteRequest.deleteMany({ where: { id: { in: quoteIds } } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  it("filters archive groups and keeps counts in the search context", async () => {
    const all = await getAdminQuotes({
      query: suffix,
      scope: "ALL",
      page: 1,
      pageSize: 25,
    });
    expect(all.total).toBe(5);
    expect(all.scopeCounts).toMatchObject({
      ALL: 5,
      OPEN: 2,
      OFFERED: 1,
      CONVERTED: 1,
      CLOSED: 1,
    });

    const open = await getAdminQuotes({
      query: suffix,
      scope: "OPEN",
      page: 1,
      pageSize: 25,
    });
    expect(open.quotes.map((quote) => quote.id).toSorted()).toEqual(
      [newQuoteId, waitingQuoteId].toSorted(),
    );

    const incompatibleStatus = await getAdminQuotes({
      query: suffix,
      scope: "CLOSED",
      status: "NEW",
      page: 1,
      pageSize: 25,
    });
    expect(incompatibleStatus.total).toBe(0);
  });

  it("searches converted order numbers and returns the order trace", async () => {
    const result = await getAdminQuotes({
      query: `ORDER-FROM-QUOTE-${suffix}`,
      page: 1,
      pageSize: 25,
    });

    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0]).toMatchObject({
      id: convertedQuoteId,
      convertedOrder: {
        id: convertedOrderId,
        orderNumber: `ORDER-FROM-QUOTE-${suffix}`,
      },
    });
  });

  it("clamps pages and omits price fields without price access", async () => {
    const result = await getAdminQuotes({
      query: suffix,
      page: 999,
      pageSize: 2,
    });

    expect(result.total).toBe(5);
    expect(result.page).toBe(3);
    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0]).not.toHaveProperty("estimatedSubtotal");
    expect(result.quotes[0]).not.toHaveProperty("activeOfferRevision");

    const priced = await getAdminQuotes({
      query: `QUOTE-NEW-${suffix}`,
      includePrices: true,
      page: 1,
      pageSize: 25,
    });
    expect(priced.quotes[0]).toHaveProperty("estimatedSubtotal");
    expect(Number(priced.quotes[0].estimatedSubtotal)).toBe(100);
  });
});
