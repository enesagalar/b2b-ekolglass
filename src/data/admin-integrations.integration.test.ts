import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { enqueueIntegrationEvent } from "@/integrations/outbox";
import { prisma } from "@/lib/prisma";

import { OutboxReplayError, replayOutboxEvent } from "./admin-integrations";

const prefix = `admin-integration-test-${randomUUID()}`;
let actorId: string;
const eventIds: string[] = [];

async function createEvent(suffix: string, status: "DEAD" | "RETRY", attempts: number) {
  const event = await prisma.$transaction((tx) =>
    enqueueIntegrationEvent(tx, {
      topic: "commerce.order.status_changed.v1",
      eventType: "ORDER_STATUS_CHANGED",
      aggregateType: "Order",
      aggregateId: `${prefix}-${suffix}`,
      payload: { orderId: `${prefix}-${suffix}`, toStatus: "CONFIRMED" },
      idempotencyKey: `${prefix}:${suffix}`,
    }),
  );
  eventIds.push(event.id);
  return prisma.integrationOutboxEvent.update({
    where: { id: event.id },
    data: {
      status,
      attempts,
      processedAt: status === "DEAD" ? new Date() : null,
      lastError: "Redakte edilmiş test hatası",
      availableAt: new Date(Date.now() + 60_000),
    },
  });
}

beforeEach(async () => {
  process.env.EMAIL_PROVIDER = "smtp";
  const actor = await prisma.user.create({
    data: {
      email: `${prefix}-${randomUUID()}@example.com`,
      name: "Integration Operator",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  actorId = actor.id;
});

afterEach(async () => {
  await prisma.integrationReplayCommand.deleteMany({ where: { outboxEventId: { in: eventIds } } });
  await prisma.auditLog.deleteMany({
    where: { entityType: "IntegrationOutboxEvent", entityId: { in: eventIds } },
  });
  await prisma.integrationLog.deleteMany({ where: { outboxEventId: { in: eventIds } } });
  await prisma.integrationOutboxEvent.deleteMany({ where: { id: { in: eventIds } } });
  await prisma.user.deleteMany({ where: { id: actorId } });
  eventIds.length = 0;
  process.env.EMAIL_PROVIDER = "disabled";
});

describe("admin outbox operations", () => {
  it("replays a dead event idempotently with an audited command", async () => {
    const event = await createEvent("dead", "DEAD", 8);
    const input = {
      eventId: event.id,
      requestId: randomUUID(),
      expectedStatus: "DEAD" as const,
      expectedAttempts: event.attempts,
      expectedUpdatedAt: event.updatedAt,
      reason: "SMTP ayarları düzeltildi.",
    };

    expect(await replayOutboxEvent(actorId, input)).toMatchObject({
      id: event.id,
      status: "PENDING",
      replayed: false,
    });
    expect(await replayOutboxEvent(actorId, input)).toMatchObject({
      id: event.id,
      status: "PENDING",
      replayed: true,
    });
    expect(
      await prisma.integrationOutboxEvent.findUniqueOrThrow({ where: { id: event.id } }),
    ).toMatchObject({ status: "PENDING", attempts: 0, lastError: null, processedAt: null });
    expect(await prisma.integrationReplayCommand.count({ where: { outboxEventId: event.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: event.id, action: "integration.outbox.replayed" } })).toBe(1);
  });

  it("expedites retry without resetting attempts or failure evidence", async () => {
    const event = await createEvent("retry", "RETRY", 3);
    const before = new Date();
    await replayOutboxEvent(actorId, {
      eventId: event.id,
      requestId: randomUUID(),
      expectedStatus: "RETRY",
      expectedAttempts: event.attempts,
      expectedUpdatedAt: event.updatedAt,
    });
    const updated = await prisma.integrationOutboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(updated).toMatchObject({ status: "RETRY", attempts: 3, lastError: event.lastError });
    expect(updated.availableAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updated.availableAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("rejects stale replay state", async () => {
    const event = await createEvent("stale", "DEAD", 8);
    await expect(
      replayOutboxEvent(actorId, {
        eventId: event.id,
        requestId: randomUUID(),
        expectedStatus: "DEAD",
        expectedAttempts: 7,
        expectedUpdatedAt: event.updatedAt,
        reason: "Hata nedeni giderildi.",
      }),
    ).rejects.toBeInstanceOf(OutboxReplayError);
  });
});
