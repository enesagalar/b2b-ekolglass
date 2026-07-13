import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { isReplayableOutboxTopic } from "@/domain/integration-topics";
import { getOutboxHealth } from "@/integrations/outbox-health";
import { prisma } from "@/lib/prisma";

export const outboxStatuses = [
  "PENDING",
  "PROCESSING",
  "RETRY",
  "SUCCEEDED",
  "DEAD",
] as const;

export type AdminIntegrationFilters = {
  query?: string;
  status?: string;
  topic?: string;
  page: number;
  pageSize: number;
};

export class OutboxReplayError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "INVALID_STATE" | "UNSUPPORTED_TOPIC" | "CONFLICT",
  ) {
    super(message);
  }
}

export async function getAdminIntegrationOverview(filters: AdminIntegrationFilters) {
  const where: Prisma.IntegrationOutboxEventWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.topic) where.topic = filters.topic;
  if (filters.query) {
    where.OR = [
      { id: { contains: filters.query } },
      { eventType: { contains: filters.query } },
      { aggregateId: { contains: filters.query } },
      { idempotencyKey: { contains: filters.query } },
    ];
  }

  const [events, total, topics, health] = await Promise.all([
    prisma.integrationOutboxEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        topic: true,
        eventType: true,
        aggregateType: true,
        aggregateId: true,
        providerCode: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        availableAt: true,
        leaseExpiresAt: true,
        processedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
        logs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, createdAt: true },
        },
      },
    }),
    prisma.integrationOutboxEvent.count({ where }),
    prisma.integrationOutboxEvent.groupBy({
      by: ["topic"],
      orderBy: { topic: "asc" },
    }),
    getOutboxHealth(),
  ]);

  return {
    events,
    total,
    topics: topics.map((item) => item.topic),
    health,
    emailWorkerEnabled: process.env.EMAIL_PROVIDER === "smtp",
  };
}

export type ReplayOutboxInput = {
  eventId: string;
  requestId: string;
  expectedStatus: "DEAD" | "RETRY";
  expectedAttempts: number;
  expectedUpdatedAt: Date;
  reason?: string;
};

export async function replayOutboxEvent(actorUserId: string, input: ReplayOutboxInput) {
  const normalizedReason = input.reason?.trim() || null;
  const requestHash = createHash("sha256")
    .update(JSON.stringify({
      eventId: input.eventId,
      expectedStatus: input.expectedStatus,
      expectedAttempts: input.expectedAttempts,
      expectedUpdatedAt: input.expectedUpdatedAt.toISOString(),
      reason: normalizedReason,
    }))
    .digest("hex");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.integrationReplayCommand.findUnique({
      where: { requestId: input.requestId },
      select: { requestHash: true, outboxEventId: true, resultStatus: true },
    });
    if (existing) {
      if (existing.requestHash !== requestHash || existing.outboxEventId !== input.eventId) {
        throw new OutboxReplayError("Replay istek anahtarı farklı bir komutla kullanılmış.", "CONFLICT");
      }
      return { id: existing.outboxEventId, status: existing.resultStatus, replayed: true };
    }

    const event = await tx.integrationOutboxEvent.findUnique({
      where: { id: input.eventId },
      select: { id: true, topic: true, status: true, attempts: true, updatedAt: true },
    });
    if (!event) throw new OutboxReplayError("Outbox kaydı bulunamadı.", "NOT_FOUND");
    if (
      !isReplayableOutboxTopic(event.topic) ||
      process.env.EMAIL_PROVIDER !== "smtp"
    ) {
      throw new OutboxReplayError("Bu topic için çalışan teslim adapteri yok.", "UNSUPPORTED_TOPIC");
    }
    if (event.status !== input.expectedStatus) {
      throw new OutboxReplayError("Yalnız retry veya dead kayıtlar yeniden kuyruğa alınabilir.", "INVALID_STATE");
    }
    if (event.status === "DEAD" && (!normalizedReason || normalizedReason.length < 10)) {
      throw new OutboxReplayError("Dead-letter replay için operasyon gerekçesi zorunludur.", "INVALID_STATE");
    }

    const replayed = await tx.integrationOutboxEvent.updateMany({
      where: {
        id: event.id,
        status: input.expectedStatus,
        attempts: input.expectedAttempts,
        updatedAt: input.expectedUpdatedAt,
        lockToken: null,
        leaseExpiresAt: null,
      },
      data:
        event.status === "DEAD"
          ? {
              status: "PENDING",
              attempts: 0,
              availableAt: new Date(),
              processedAt: null,
              lastError: null,
            }
          : { availableAt: new Date() },
    });
    if (replayed.count !== 1) {
      throw new OutboxReplayError("Outbox kaydı başka bir işlem tarafından değiştirildi.", "CONFLICT");
    }
    const operation = event.status === "DEAD" ? "DEAD_REPLAY" : "RETRY_NOW";
    const resultStatus = event.status === "DEAD" ? "PENDING" : "RETRY";
    await tx.integrationReplayCommand.create({
      data: {
        requestId: input.requestId,
        requestHash,
        outboxEventId: event.id,
        actorUserId,
        operation,
        fromStatus: event.status,
        resultStatus,
        reason: normalizedReason,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId,
        action:
          event.status === "DEAD"
            ? "integration.outbox.replayed"
            : "integration.outbox.retry_expedited",
        entityType: "IntegrationOutboxEvent",
        entityId: event.id,
        metadata: JSON.stringify({
          topic: event.topic,
          fromStatus: event.status,
          previousAttempts: event.attempts,
          reason: normalizedReason,
          requestId: input.requestId,
        }),
      },
    });
    return { id: event.id, status: resultStatus, replayed: false };
  });
}
