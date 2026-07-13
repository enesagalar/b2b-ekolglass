import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type EnqueueIntegrationEventInput = {
  topic: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  providerCode?: string;
  payload: unknown;
  idempotencyKey: string;
  availableAt?: Date;
  maxAttempts?: number;
};

export type OutboxHandlerContext = {
  eventId: string;
  topic: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  providerCode: string | null;
  attempt: number;
};

export type OutboxHandler = (
  payload: unknown,
  context: OutboxHandlerContext,
) => Promise<unknown>;

export type OutboxHandlerRegistry = Record<string, OutboxHandler>;

export class PermanentOutboxError extends Error {}
export class OutboxLeaseLostError extends Error {}

const SENSITIVE_KEY = /authorization|cookie|password|passphrase|token|api[-_]?key|client[-_]?secret|smtp/i;

function redactText(value: string) {
  return value
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [REDACTED]")
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi, "$1[REDACTED]@")
    .replace(/([?&](?:access_token|token|api[-_]?key|apikey|password|client_secret|secret)=)[^&#\s]+/gi, "$1[REDACTED]")
    .replace(/\b(authorization|smtp_password|password|access_token|client_secret|api[-_]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactValue(entry),
      ]),
    );
  }
  return value;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value instanceof Date ? value.toISOString() : value;
}

function stableJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function truncate(value: string, limit = 2000) {
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function errorMessage(error: unknown) {
  return truncate(
    redactText(error instanceof Error ? error.message : "Bilinmeyen entegrasyon hatası."),
  );
}

function retryDelayMs(attempt: number) {
  return Math.min(60 * 60 * 1000, 30 * 1000 * 2 ** Math.max(0, attempt - 1));
}

export async function enqueueIntegrationEvent(
  tx: Prisma.TransactionClient,
  input: EnqueueIntegrationEventInput,
) {
  if ((input.maxAttempts ?? 8) < 1) {
    throw new Error("Outbox maksimum deneme sayısı en az 1 olmalıdır.");
  }
  const payload = stableJson(input.payload);
  const event = await tx.integrationOutboxEvent.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      topic: input.topic,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      providerCode: input.providerCode,
      payload,
      idempotencyKey: input.idempotencyKey,
      availableAt: input.availableAt,
      maxAttempts: input.maxAttempts ?? 8,
    },
    select: {
      id: true,
      topic: true,
      eventType: true,
      aggregateType: true,
      aggregateId: true,
      providerCode: true,
      payload: true,
    },
  });
  if (
    event.topic !== input.topic ||
    event.eventType !== input.eventType ||
    event.aggregateType !== input.aggregateType ||
    event.aggregateId !== input.aggregateId ||
    event.providerCode !== (input.providerCode ?? null) ||
    event.payload !== payload
  ) {
    throw new Error("Outbox idempotency anahtarı farklı bir olayla kullanılmış.");
  }
  return event;
}

export async function claimOutboxBatch({
  workerId,
  topics,
  limit = 10,
  leaseMs = 5 * 60 * 1000,
  now = new Date(),
}: {
  workerId: string;
  topics: string[];
  limit?: number;
  leaseMs?: number;
  now?: Date;
}) {
  const normalizedTopics = [...new Set(topics.filter(Boolean))];
  if (normalizedTopics.length === 0) return [];
  const topicFilter = Prisma.sql`AND "topic" IN (${Prisma.join(normalizedTopics)})`;
  const safeLimit = Math.min(100, Math.max(1, limit));
  const leaseExpiresAt = new Date(now.getTime() + Math.max(1000, leaseMs));
  const claimed = [];

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "IntegrationOutboxEvent"
    SET
      "status" = 'DEAD',
      "processedAt" = ${now},
      "lockedAt" = NULL,
      "leaseExpiresAt" = NULL,
      "lockToken" = NULL,
      "lastError" = 'Worker son denemede lease süresini doldurdu.',
      "updatedAt" = ${now}
    WHERE "status" = 'PROCESSING'
      AND "leaseExpiresAt" <= ${now}
      AND "attempts" >= "maxAttempts"
      ${topicFilter}
  `);

  for (let index = 0; index < safeLimit; index += 1) {
    const lockToken = `${workerId}:${randomUUID()}`;
    const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      UPDATE "IntegrationOutboxEvent"
      SET
        "status" = 'PROCESSING',
        "attempts" = "attempts" + 1,
        "lockedAt" = ${now},
        "leaseExpiresAt" = ${leaseExpiresAt},
        "lockToken" = ${lockToken},
        "lastError" = NULL,
        "updatedAt" = ${now}
      WHERE "id" = (
        SELECT "id"
        FROM "IntegrationOutboxEvent"
        WHERE (
          ("status" IN ('PENDING', 'RETRY') AND "availableAt" <= ${now})
          OR ("status" = 'PROCESSING' AND "leaseExpiresAt" <= ${now})
        )
        AND "attempts" < "maxAttempts"
        ${topicFilter}
        ORDER BY "availableAt" ASC, "createdAt" ASC, "id" ASC
        LIMIT 1
      )
      RETURNING "id"
    `);
    if (rows.length === 0) break;
    claimed.push(
      await prisma.integrationOutboxEvent.findFirstOrThrow({
        where: { id: rows[0].id, status: "PROCESSING", lockToken },
      }),
    );
  }
  return claimed;
}

async function providerId(
  tx: Prisma.TransactionClient,
  providerCode: string | null,
) {
  if (!providerCode) return null;
  return (
    await tx.shippingProvider.findUnique({
      where: { code: providerCode },
      select: { id: true },
    })
  )?.id ?? null;
}

export async function completeOutboxEvent({
  eventId,
  lockToken,
  response,
  now = new Date(),
}: {
  eventId: string;
  lockToken: string;
  response?: unknown;
  now?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.integrationOutboxEvent.findUniqueOrThrow({
      where: { id: eventId },
    });
    const completed = await tx.integrationOutboxEvent.updateMany({
      where: { id: eventId, status: "PROCESSING", lockToken },
      data: {
        status: "SUCCEEDED",
        processedAt: now,
        lockedAt: null,
        leaseExpiresAt: null,
        lockToken: null,
        lastError: null,
      },
    });
    if (completed.count !== 1) {
      throw new OutboxLeaseLostError("Outbox lease artık bu worker'a ait değil.");
    }
    await tx.integrationLog.create({
      data: {
        providerId: await providerId(tx, event.providerCode),
        outboxEventId: event.id,
        direction: "OUTBOUND",
        operation: event.eventType,
        status: "SUCCEEDED",
        entityType: event.aggregateType,
        entityId: event.aggregateId,
        requestSummary: stableJson({ topic: event.topic, attempt: event.attempts }),
        responseSummary:
          response === undefined ? null : truncate(stableJson(redactValue(response))),
        retryCount: Math.max(0, event.attempts - 1),
      },
    });
  });
}

export async function failOutboxEvent({
  eventId,
  lockToken,
  error,
  now = new Date(),
}: {
  eventId: string;
  lockToken: string;
  error: unknown;
  now?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.integrationOutboxEvent.findUniqueOrThrow({
      where: { id: eventId },
    });
    if (event.status !== "PROCESSING" || event.lockToken !== lockToken) {
      throw new OutboxLeaseLostError("Outbox lease artık bu worker'a ait değil.");
    }
    const dead =
      error instanceof PermanentOutboxError || event.attempts >= event.maxAttempts;
    const message = errorMessage(error);
    const nextAvailableAt = dead
      ? event.availableAt
      : new Date(now.getTime() + retryDelayMs(event.attempts));
    const updated = await tx.integrationOutboxEvent.updateMany({
      where: { id: event.id, status: "PROCESSING", lockToken },
      data: {
        status: dead ? "DEAD" : "RETRY",
        availableAt: nextAvailableAt,
        processedAt: dead ? now : null,
        lockedAt: null,
        leaseExpiresAt: null,
        lockToken: null,
        lastError: message,
      },
    });
    if (updated.count !== 1) {
      throw new OutboxLeaseLostError("Outbox sonucu eşzamanlı olarak değişti.");
    }
    await tx.integrationLog.create({
      data: {
        providerId: await providerId(tx, event.providerCode),
        outboxEventId: event.id,
        direction: "OUTBOUND",
        operation: event.eventType,
        status: dead ? "DEAD" : "FAILED",
        entityType: event.aggregateType,
        entityId: event.aggregateId,
        requestSummary: stableJson({ topic: event.topic, attempt: event.attempts }),
        errorMessage: message,
        retryCount: Math.max(0, event.attempts - 1),
      },
    });
    return { dead, availableAt: dead ? null : nextAvailableAt };
  });
}

export async function processOutboxBatch(
  handlers: OutboxHandlerRegistry,
  options: { workerId: string; limit?: number; leaseMs?: number; now?: Date },
) {
  const topics = Object.keys(handlers);
  if (topics.length === 0) return [];
  const events = await claimOutboxBatch({ ...options, topics });
  const results: Array<{
    eventId: string;
    status: "SUCCEEDED" | "RETRY" | "DEAD" | "LEASE_LOST";
  }> = [];
  for (const event of events) {
    const handler = handlers[event.topic];
    if (!handler) continue;
    let payload: unknown;
    try {
      try {
        payload = JSON.parse(event.payload);
      } catch {
        throw new PermanentOutboxError("Outbox payload geçerli JSON değil.");
      }
      const response = await handler(payload, {
        eventId: event.id,
        topic: event.topic,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        providerCode: event.providerCode,
        attempt: event.attempts,
      });
      try {
        await completeOutboxEvent({
          eventId: event.id,
          lockToken: event.lockToken!,
          response,
          now: options.now,
        });
        results.push({ eventId: event.id, status: "SUCCEEDED" });
      } catch (error) {
        if (!(error instanceof OutboxLeaseLostError)) throw error;
        results.push({ eventId: event.id, status: "LEASE_LOST" });
      }
    } catch (error) {
      try {
        const failed = await failOutboxEvent({
          eventId: event.id,
          lockToken: event.lockToken!,
          error,
          now: options.now,
        });
        results.push({
          eventId: event.id,
          status: failed.dead ? "DEAD" : "RETRY",
        });
      } catch (failError) {
        if (!(failError instanceof OutboxLeaseLostError)) throw failError;
        results.push({ eventId: event.id, status: "LEASE_LOST" });
      }
    }
  }
  return results;
}
