import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  priceQuote,
  QuoteOperationError,
  transitionQuoteStatus,
} from "@/data/quote-operations";
import { prisma } from "@/lib/prisma";

const suffix = Date.now().toString();
const companyId = `quote-ops-company-${suffix}`;
const actorId = `quote-ops-user-${suffix}`;
const quoteIds: string[] = [];

async function createQuote(status = "IN_REVIEW") {
  const quote = await prisma.quoteRequest.create({
    data: {
      quoteNumber: `OPS-${crypto.randomUUID()}`,
      companyId,
      requesterName: "Quote Operator Test",
      requesterEmail: `quote-ops-${suffix}@example.com`,
      status,
      currency: "TRY",
      estimatedSubtotal: 30,
      hasUnpricedItems: false,
      submittedAt: new Date(),
      items: {
        create: {
          customTitle: "Snapshot Product",
          quantity: 3,
          unitPrice: 10,
          lineTotal: 30,
          priceScope: "COMPANY",
        },
      },
    },
    include: { items: true },
  });
  quoteIds.push(quote.id);
  return quote;
}

describe("quote operations", () => {
  beforeAll(async () => {
    await prisma.company.create({
      data: {
        id: companyId,
        legalName: "Quote Operations Test",
        displayName: "Quote Ops",
        email: `company-${suffix}@example.com`,
        phone: "1",
        city: "Istanbul",
        status: "APPROVED",
      },
    });
    await prisma.user.create({
      data: {
        id: actorId,
        email: `operator-${suffix}@example.com`,
        name: "Quote Operator",
        role: "SALES_MANAGER",
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    await prisma.quoteRequest.updateMany({
      where: { id: { in: quoteIds } },
      data: { activeOfferRevisionId: null },
    });
    await prisma.quoteOfferRevisionItem.deleteMany({
      where: { revision: { quoteId: { in: quoteIds } } },
    });
    await prisma.quoteOfferRevision.deleteMany({
      where: { quoteId: { in: quoteIds } },
    });
    await prisma.quoteOperationCommand.deleteMany({
      where: { quoteId: { in: quoteIds } },
    });
    await prisma.quoteStatusHistory.deleteMany({
      where: { quoteId: { in: quoteIds } },
    });
    await prisma.auditLog.deleteMany({
      where: { entityType: "QuoteRequest", entityId: { in: quoteIds } },
    });
    await prisma.quoteRequest.deleteMany({ where: { id: { in: quoteIds } } });
    await prisma.user.delete({ where: { id: actorId } });
    await prisma.company.delete({ where: { id: companyId } });
  });

  it("creates an immutable offer revision and preserves submission snapshots", async () => {
    const quote = await createQuote();
    const idempotencyKey = crypto.randomUUID();
    const input = {
      quoteId: quote.id,
      expectedStatus: "IN_REVIEW" as const,
      expectedVersion: 1,
      idempotencyKey,
      currency: "EUR",
      internalNotes: "Margin approved",
      items: [{ itemId: quote.items[0]!.id, unitPrice: "12.34" }],
    };

    const first = await priceQuote({ userId: actorId }, input);
    const replay = await priceQuote({ userId: actorId }, input);
    expect(first).toMatchObject({ status: "PRICED", version: 2, replayed: false });
    expect(replay).toMatchObject({ status: "PRICED", version: 2, replayed: true });

    const persisted = await prisma.quoteRequest.findUniqueOrThrow({
      where: { id: quote.id },
      include: {
        items: true,
        activeOfferRevision: { include: { items: true } },
        statusHistory: true,
        operationCommands: true,
      },
    });
    expect(persisted.estimatedSubtotal?.toString()).toBe("30");
    expect(persisted.items[0]?.unitPrice?.toString()).toBe("10");
    expect(persisted.items[0]?.priceScope).toBe("COMPANY");
    expect(persisted.activeOfferRevision?.revisionNumber).toBe(1);
    expect(persisted.activeOfferRevision?.currency).toBe("EUR");
    expect(persisted.activeOfferRevision?.subtotal.toString()).toBe("37.02");
    expect(persisted.activeOfferRevision?.items[0]?.lineTotal.toString()).toBe(
      "37.02",
    );
    expect(persisted.statusHistory).toHaveLength(1);
    expect(persisted.operationCommands).toHaveLength(1);
  });

  it("rejects stale versions and idempotency key payload conflicts", async () => {
    const quote = await createQuote();
    const key = crypto.randomUUID();
    const base = {
      quoteId: quote.id,
      expectedStatus: "IN_REVIEW" as const,
      expectedVersion: 1,
      idempotencyKey: key,
      currency: "TRY",
      items: [{ itemId: quote.items[0]!.id, unitPrice: "20.00" }],
    };
    await priceQuote({ userId: actorId }, base);
    await expect(
      priceQuote(
        { userId: actorId },
        { ...base, items: [{ itemId: quote.items[0]!.id, unitPrice: "21.00" }] },
      ),
    ).rejects.toMatchObject<Partial<QuoteOperationError>>({ code: "CONFLICT" });
    await expect(
      priceQuote(
        { userId: actorId },
        { ...base, idempotencyKey: crypto.randomUUID() },
      ),
    ).rejects.toMatchObject<Partial<QuoteOperationError>>({ code: "CONFLICT" });
  });

  it("requires an active offer revision before sending", async () => {
    const quote = await createQuote("PRICED");
    await expect(
      transitionQuoteStatus(
        { userId: actorId },
        {
          quoteId: quote.id,
          expectedStatus: "PRICED",
          expectedVersion: 1,
          targetStatus: "OFFER_SENT",
          idempotencyKey: crypto.randomUUID(),
        },
      ),
    ).rejects.toMatchObject<Partial<QuoteOperationError>>({
      code: "INVALID_PRICING",
    });
  });

  it("records an idempotent status transition after pricing", async () => {
    const quote = await createQuote();
    await priceQuote(
      { userId: actorId },
      {
        quoteId: quote.id,
        expectedStatus: "IN_REVIEW",
        expectedVersion: 1,
        idempotencyKey: crypto.randomUUID(),
        currency: "TRY",
        items: [{ itemId: quote.items[0]!.id, unitPrice: "15.00" }],
      },
    );
    const key = crypto.randomUUID();
    const input = {
      quoteId: quote.id,
      expectedStatus: "PRICED" as const,
      expectedVersion: 2,
      targetStatus: "OFFER_SENT" as const,
      idempotencyKey: key,
      note: "Offer delivered by sales",
    };
    const first = await transitionQuoteStatus({ userId: actorId }, input);
    const replay = await transitionQuoteStatus({ userId: actorId }, input);
    expect(first).toMatchObject({ status: "OFFER_SENT", version: 3, replayed: false });
    expect(replay).toMatchObject({ status: "OFFER_SENT", version: 3, replayed: true });
    expect(
      await prisma.quoteStatusHistory.count({ where: { quoteId: quote.id } }),
    ).toBe(2);
  });
});
