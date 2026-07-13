import { createHash } from "node:crypto";

import {
  canTransitionQuote,
  type QuoteStatus,
} from "@/domain/quote-transitions";
import { getStatusLabel } from "@/domain/statuses";
import { Prisma } from "@/generated/prisma/client";
import { enqueueIntegrationEvent } from "@/integrations/outbox";
import { prisma } from "@/lib/prisma";

export type QuoteOperationActor = { userId: string };

export type QuoteTransitionInput = {
  quoteId: string;
  expectedStatus: QuoteStatus;
  expectedVersion: number;
  targetStatus: QuoteStatus;
  idempotencyKey: string;
  note?: string;
};

export type QuotePricingInput = {
  quoteId: string;
  expectedStatus: QuoteStatus;
  expectedVersion: number;
  idempotencyKey: string;
  currency: string;
  internalNotes?: string;
  items: Array<{ itemId: string; unitPrice: string }>;
};

export type QuoteOperationErrorCode =
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "INVALID_PRICING"
  | "INVALID_CONVERSION"
  | "NOT_FOUND";

export class QuoteOperationError extends Error {
  constructor(
    message: string,
    readonly code: QuoteOperationErrorCode,
  ) {
    super(message);
  }
}

function requestHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function replayResult(command: {
  quoteId: string;
  toStatus: string;
  resultVersion: number;
}) {
  return {
    id: command.quoteId,
    status: command.toStatus as QuoteStatus,
    version: command.resultVersion,
    replayed: true,
  };
}

async function findReplay(
  quoteId: string,
  idempotencyKey: string,
  hash: string,
) {
  const command = await prisma.quoteOperationCommand.findUnique({
    where: { quoteId_idempotencyKey: { quoteId, idempotencyKey } },
  });
  if (!command) return null;
  if (command.requestHash !== hash) {
    throw new QuoteOperationError(
      "Aynı işlem anahtarı farklı bir istekle kullanılamaz.",
      "CONFLICT",
    );
  }
  return replayResult(command);
}

async function acquireOperationLock(tx: Prisma.TransactionClient) {
  await tx.checkoutLock.upsert({
    where: { id: "quote-operations" },
    create: { id: "quote-operations", version: 1 },
    update: { version: { increment: 1 } },
  });
}

export async function transitionQuoteStatus(
  actor: QuoteOperationActor,
  input: QuoteTransitionInput,
) {
  const hash = requestHash({
    operation: "STATUS",
    actorUserId: actor.userId,
    ...input,
    note: input.note?.trim() || null,
  });
  const replay = await findReplay(input.quoteId, input.idempotencyKey, hash);
  if (replay) return replay;

  return prisma.$transaction(async (tx) => {
    await acquireOperationLock(tx);
    const command = await tx.quoteOperationCommand.findUnique({
      where: {
        quoteId_idempotencyKey: {
          quoteId: input.quoteId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (command) {
      if (command.requestHash !== hash) {
        throw new QuoteOperationError(
          "Aynı işlem anahtarı farklı bir istekle kullanılamaz.",
          "CONFLICT",
        );
      }
      return replayResult(command);
    }

    const quote = await tx.quoteRequest.findUnique({
      where: { id: input.quoteId },
      select: {
        id: true,
        status: true,
        version: true,
        activeOfferRevisionId: true,
      },
    });
    if (!quote) {
      throw new QuoteOperationError("Teklif bulunamadı.", "NOT_FOUND");
    }
    if (
      quote.status !== input.expectedStatus ||
      quote.version !== input.expectedVersion
    ) {
      throw new QuoteOperationError(
        "Teklif başka bir kullanıcı tarafından güncellendi. Güncel veriyi yükleyin.",
        "CONFLICT",
      );
    }
    if (!canTransitionQuote(quote.status, input.targetStatus)) {
      throw new QuoteOperationError(
        `${getStatusLabel(quote.status)} durumundan ${getStatusLabel(input.targetStatus)} durumuna doğrudan geçilemez.`,
        "INVALID_TRANSITION",
      );
    }
    if (input.targetStatus === "PRICED") {
      throw new QuoteOperationError(
        "Fiyatlandırıldı durumu yalnızca tam kalem fiyatlandırmasıyla oluşturulabilir.",
        "INVALID_TRANSITION",
      );
    }
    if (
      ["OFFER_SENT", "APPROVED"].includes(input.targetStatus) &&
      !quote.activeOfferRevisionId
    ) {
      throw new QuoteOperationError(
        "Tüm kalemler fiyatlandırılmadan teklif gönderilemez veya onaylanamaz.",
        "INVALID_PRICING",
      );
    }

    const resultVersion = quote.version + 1;
    const updated = await tx.quoteRequest.updateMany({
      where: {
        id: quote.id,
        status: quote.status,
        version: quote.version,
      },
      data: { status: input.targetStatus, version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new QuoteOperationError(
        "Teklif başka bir işlem tarafından güncellendi.",
        "CONFLICT",
      );
    }

    await tx.quoteStatusHistory.create({
      data: {
        quoteId: quote.id,
        fromStatus: quote.status,
        toStatus: input.targetStatus,
        changedById: actor.userId,
        note: input.note,
      },
    });
    await tx.quoteOperationCommand.create({
      data: {
        quoteId: quote.id,
        idempotencyKey: input.idempotencyKey,
        operation: "STATUS",
        requestHash: hash,
        fromStatus: quote.status,
        toStatus: input.targetStatus,
        resultVersion,
        createdById: actor.userId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: "quote.status.changed",
        entityType: "QuoteRequest",
        entityId: quote.id,
        metadata: JSON.stringify({
          fromStatus: quote.status,
          toStatus: input.targetStatus,
          fromVersion: quote.version,
          toVersion: resultVersion,
          idempotencyKey: input.idempotencyKey,
          note: input.note ?? null,
        }),
      },
    });
    await enqueueIntegrationEvent(tx, {
      topic: "commerce.quote.status_changed.v1",
      eventType: "QUOTE_STATUS_CHANGED",
      aggregateType: "QuoteRequest",
      aggregateId: quote.id,
      payload: {
        quoteId: quote.id,
        fromStatus: quote.status,
        toStatus: input.targetStatus,
        resultVersion,
        activeOfferRevisionId: quote.activeOfferRevisionId,
      },
      idempotencyKey: `quote:${quote.id}:status:${resultVersion}`,
    });

    return {
      id: quote.id,
      status: input.targetStatus,
      version: resultVersion,
      replayed: false,
    };
  });
}

export async function priceQuote(
  actor: QuoteOperationActor,
  input: QuotePricingInput,
) {
  const normalizedItems = [...input.items]
    .map((item) => ({
      itemId: item.itemId,
      unitPrice: new Prisma.Decimal(item.unitPrice).toFixed(2),
    }))
    .sort((left, right) => left.itemId.localeCompare(right.itemId));
  const hash = requestHash({
    operation: "PRICE",
    actorUserId: actor.userId,
    quoteId: input.quoteId,
    expectedStatus: input.expectedStatus,
    expectedVersion: input.expectedVersion,
    currency: input.currency,
    internalNotes: input.internalNotes?.trim() || null,
    items: normalizedItems,
  });
  const replay = await findReplay(input.quoteId, input.idempotencyKey, hash);
  if (replay) return replay;

  return prisma.$transaction(async (tx) => {
    await acquireOperationLock(tx);
    const command = await tx.quoteOperationCommand.findUnique({
      where: {
        quoteId_idempotencyKey: {
          quoteId: input.quoteId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (command) {
      if (command.requestHash !== hash) {
        throw new QuoteOperationError(
          "Aynı işlem anahtarı farklı bir istekle kullanılamaz.",
          "CONFLICT",
        );
      }
      return replayResult(command);
    }

    const quote = await tx.quoteRequest.findUnique({
      where: { id: input.quoteId },
      select: {
        id: true,
        status: true,
        version: true,
        items: {
          select: {
            id: true,
            quantity: true,
            dimensions: true,
            glassType: true,
            product: { select: { code: true, name: true } },
          },
        },
        _count: { select: { offerRevisions: true } },
      },
    });
    if (!quote) {
      throw new QuoteOperationError("Teklif bulunamadı.", "NOT_FOUND");
    }
    if (
      quote.status !== input.expectedStatus ||
      quote.version !== input.expectedVersion
    ) {
      throw new QuoteOperationError(
        "Teklif başka bir kullanıcı tarafından güncellendi. Güncel veriyi yükleyin.",
        "CONFLICT",
      );
    }
    if (!["IN_REVIEW", "PRICED", "OFFER_SENT"].includes(quote.status)) {
      throw new QuoteOperationError(
        "Teklif fiyatlandırılmadan önce incelemeye alınmalıdır.",
        "INVALID_TRANSITION",
      );
    }
    if (
      quote.items.length !== normalizedItems.length ||
      quote.items.some(
        (item) => !normalizedItems.some((price) => price.itemId === item.id),
      ) ||
      new Set(normalizedItems.map((item) => item.itemId)).size !==
        normalizedItems.length
    ) {
      throw new QuoteOperationError(
        "Fiyatlandırma tüm güncel teklif kalemlerini tam olarak içermelidir.",
        "INVALID_PRICING",
      );
    }

    let subtotal = new Prisma.Decimal(0);
    const revisionItems: Array<{
      quoteRequestItemId: string;
      quantitySnapshot: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      productCodeSnapshot: string | null;
      productNameSnapshot: string | null;
      dimensionsSnapshot: string | null;
      glassTypeSnapshot: string | null;
    }> = [];
    for (const item of quote.items) {
      const submitted = normalizedItems.find(
        (price) => price.itemId === item.id,
      )!;
      const unitPrice = new Prisma.Decimal(submitted.unitPrice);
      const lineTotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);
      revisionItems.push({
        quoteRequestItemId: item.id,
        quantitySnapshot: item.quantity,
        unitPrice,
        lineTotal,
        productCodeSnapshot: item.product?.code ?? null,
        productNameSnapshot: item.product?.name ?? null,
        dimensionsSnapshot: item.dimensions,
        glassTypeSnapshot: item.glassType,
      });
    }

    const revisionNumber = quote._count.offerRevisions + 1;
    const revision = await tx.quoteOfferRevision.create({
      data: {
        quoteId: quote.id,
        revisionNumber,
        currency: input.currency,
        subtotal,
        internalNotes: input.internalNotes,
        createdById: actor.userId,
        items: { create: revisionItems },
      },
      select: { id: true },
    });

    const resultVersion = quote.version + 1;
    const updated = await tx.quoteRequest.updateMany({
      where: {
        id: quote.id,
        status: quote.status,
        version: quote.version,
      },
      data: {
        status: "PRICED",
        version: { increment: 1 },
        activeOfferRevisionId: revision.id,
        pricedAt: new Date(),
        internalNotes: input.internalNotes,
      },
    });
    if (updated.count !== 1) {
      throw new QuoteOperationError(
        "Teklif başka bir işlem tarafından güncellendi.",
        "CONFLICT",
      );
    }

    if (quote.status !== "PRICED") {
      await tx.quoteStatusHistory.create({
        data: {
          quoteId: quote.id,
          fromStatus: quote.status,
          toStatus: "PRICED",
          changedById: actor.userId,
          note: "Teklif kalemleri fiyatlandırıldı.",
        },
      });
    }
    await tx.quoteOperationCommand.create({
      data: {
        quoteId: quote.id,
        idempotencyKey: input.idempotencyKey,
        operation: "PRICE",
        requestHash: hash,
        fromStatus: quote.status,
        toStatus: "PRICED",
        resultVersion,
        createdById: actor.userId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: "quote.priced",
        entityType: "QuoteRequest",
        entityId: quote.id,
        metadata: JSON.stringify({
          fromStatus: quote.status,
          toStatus: "PRICED",
          fromVersion: quote.version,
          toVersion: resultVersion,
          currency: input.currency,
          subtotal: subtotal.toString(),
          revisionId: revision.id,
          revisionNumber,
          itemCount: quote.items.length,
          idempotencyKey: input.idempotencyKey,
        }),
      },
    });

    return {
      id: quote.id,
      status: "PRICED" as const,
      version: resultVersion,
      replayed: false,
    };
  });
}
