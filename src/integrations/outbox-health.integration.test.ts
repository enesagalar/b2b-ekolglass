import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { enqueueIntegrationEvent } from "./outbox";
import { getOutboxHealth } from "./outbox-health";

const prefix = `outbox-health-test-${randomUUID()}`;
const eventIds: string[] = [];

afterEach(async () => {
  await prisma.integrationLog.deleteMany({ where: { outboxEventId: { in: eventIds } } });
  await prisma.integrationOutboxEvent.deleteMany({ where: { id: { in: eventIds } } });
  eventIds.length = 0;
  process.env.EMAIL_PROVIDER = "disabled";
});

describe("outbox health", () => {
  it("marks due topics without an active handler as degraded", async () => {
    process.env.EMAIL_PROVIDER = "smtp";
    const event = await prisma.$transaction((tx) =>
      enqueueIntegrationEvent(tx, {
        topic: "commerce.quote.converted_to_order.v1",
        eventType: "QUOTE_CONVERTED_TO_ORDER",
        aggregateType: "QuoteRequest",
        aggregateId: `${prefix}-unsupported`,
        payload: { quoteId: `${prefix}-unsupported` },
        idempotencyKey: `${prefix}:unsupported`,
        availableAt: new Date("2000-01-01T00:00:00.000Z"),
      }),
    );
    eventIds.push(event.id);

    const health = await getOutboxHealth();
    expect(health.status).toBe("degraded");
    expect(health.unsupportedReady).toBeGreaterThanOrEqual(1);
    expect(health.unsupportedTopics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ topic: "commerce.quote.converted_to_order.v1" }),
      ]),
    );
  });

  it("detects an expired processing lease", async () => {
    const event = await prisma.$transaction((tx) =>
      enqueueIntegrationEvent(tx, {
        topic: "commerce.order.submitted.v1",
        eventType: "ORDER_SUBMITTED",
        aggregateType: "Order",
        aggregateId: `${prefix}-lease`,
        payload: { orderId: `${prefix}-lease` },
        idempotencyKey: `${prefix}:lease`,
      }),
    );
    eventIds.push(event.id);
    await prisma.integrationOutboxEvent.update({
      where: { id: event.id },
      data: {
        status: "PROCESSING",
        attempts: 1,
        lockedAt: new Date("2000-01-01T00:00:00.000Z"),
        leaseExpiresAt: new Date("2000-01-01T00:01:00.000Z"),
        lockToken: "expired-health-test-lock",
      },
    });

    const health = await getOutboxHealth();
    expect(health.status).toBe("degraded");
    expect(health.expiredLeases).toBeGreaterThanOrEqual(1);
  });
});
