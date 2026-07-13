import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  claimOutboxBatch,
  completeOutboxEvent,
  enqueueIntegrationEvent,
  processOutboxBatch,
} from "./outbox";

const testPrefix = `outbox-test-${randomUUID()}`;

function input(suffix: string, options?: { maxAttempts?: number }) {
  return {
    topic: "test.integration.v1",
    eventType: "TEST_EVENT",
    aggregateType: "OutboxTest",
    aggregateId: `${testPrefix}-${suffix}`,
    payload: { suffix, schemaVersion: 1 },
    idempotencyKey: `${testPrefix}:${suffix}`,
    availableAt: new Date("2000-01-01T00:00:00.000Z"),
    maxAttempts: options?.maxAttempts,
  };
}

async function enqueue(suffix: string, options?: { maxAttempts?: number }) {
  return prisma.$transaction((tx) =>
    enqueueIntegrationEvent(tx, input(suffix, options)),
  );
}

afterEach(async () => {
  const events = await prisma.integrationOutboxEvent.findMany({
    where: { aggregateId: { startsWith: testPrefix } },
    select: { id: true },
  });
  await prisma.integrationLog.deleteMany({
    where: { outboxEventId: { in: events.map((event) => event.id) } },
  });
  await prisma.integrationOutboxEvent.deleteMany({
    where: { aggregateId: { startsWith: testPrefix } },
  });
});

describe("integration outbox", () => {
  it("enqueues idempotently and rejects conflicting key reuse", async () => {
    const first = await enqueue("idempotent");
    const replay = await enqueue("idempotent");

    expect(replay.id).toBe(first.id);
    await expect(
      prisma.$transaction((tx) =>
        enqueueIntegrationEvent(tx, {
          ...input("idempotent"),
          payload: { suffix: "different", schemaVersion: 1 },
        }),
      ),
    ).rejects.toThrow("farklı bir olayla");
  });

  it("rolls the event back with its business transaction", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await enqueueIntegrationEvent(tx, input("rollback"));
        throw new Error("business rollback");
      }),
    ).rejects.toThrow("business rollback");

    expect(
      await prisma.integrationOutboxEvent.count({
        where: { idempotencyKey: `${testPrefix}:rollback` },
      }),
    ).toBe(0);
  });

  it("allows only one worker to claim an event", async () => {
    const event = await enqueue("claim-once");
    const now = new Date("2000-01-01T00:01:00.000Z");

    const [left, right] = await Promise.all([
      claimOutboxBatch({ workerId: "worker-left", limit: 1, now }),
      claimOutboxBatch({ workerId: "worker-right", limit: 1, now }),
    ]);

    expect([...left, ...right].map((claimed) => claimed.id)).toEqual([event.id]);
  });

  it("reclaims an expired lease and rejects the old worker token", async () => {
    const event = await enqueue("stale-lease");
    const startedAt = new Date("2000-01-01T00:02:00.000Z");
    const first = await claimOutboxBatch({
      workerId: "worker-old",
      limit: 1,
      leaseMs: 1000,
      now: startedAt,
    });
    const second = await claimOutboxBatch({
      workerId: "worker-new",
      limit: 1,
      leaseMs: 1000,
      now: new Date(startedAt.getTime() + 1001),
    });

    expect(second[0].id).toBe(event.id);
    expect(second[0].attempts).toBe(2);
    await expect(
      completeOutboxEvent({
        eventId: event.id,
        lockToken: first[0].lockToken!,
      }),
    ).rejects.toThrow("artık bu worker'a ait değil");
  });

  it("records successful delivery after the handler runs outside claim", async () => {
    const event = await enqueue("success");
    const seenStatuses: string[] = [];
    const result = await processOutboxBatch(
      {
        "test.integration.v1": async (_payload, context) => {
          const current = await prisma.integrationOutboxEvent.findUniqueOrThrow({
            where: { id: context.eventId },
          });
          seenStatuses.push(current.status);
          return { accepted: true };
        },
      },
      { workerId: "worker-success", limit: 1 },
    );

    expect(seenStatuses).toEqual(["PROCESSING"]);
    expect(result).toEqual([{ eventId: event.id, status: "SUCCEEDED" }]);
    expect(
      await prisma.integrationLog.count({
        where: { outboxEventId: event.id, status: "SUCCEEDED" },
      }),
    ).toBe(1);
  });

  it("backs off transient errors and dead-letters the final attempt", async () => {
    const event = await enqueue("retry-dead", { maxAttempts: 2 });
    const firstAttemptAt = new Date("2000-01-01T00:03:00.000Z");
    const handlers = {
      "test.integration.v1": async () => {
        throw new Error("temporary provider failure");
      },
    };

    expect(
      await processOutboxBatch(handlers, {
        workerId: "worker-retry",
        limit: 1,
        now: firstAttemptAt,
      }),
    ).toEqual([{ eventId: event.id, status: "RETRY" }]);
    const retried = await prisma.integrationOutboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(retried.availableAt).toEqual(
      new Date(firstAttemptAt.getTime() + 30_000),
    );

    expect(
      await processOutboxBatch(handlers, {
        workerId: "worker-too-early",
        limit: 1,
        now: new Date(firstAttemptAt.getTime() + 29_999),
      }),
    ).toEqual([]);
    expect(
      await processOutboxBatch(handlers, {
        workerId: "worker-final",
        limit: 1,
        now: new Date(firstAttemptAt.getTime() + 30_000),
      }),
    ).toEqual([{ eventId: event.id, status: "DEAD" }]);

    const dead = await prisma.integrationOutboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(dead.status).toBe("DEAD");
    expect(dead.attempts).toBe(2);
    expect(
      await prisma.integrationLog.count({
        where: { outboxEventId: event.id },
      }),
    ).toBe(2);
  });

  it("dead-letters an unknown topic without repeated delivery", async () => {
    const event = await enqueue("unknown-topic");

    expect(
      await processOutboxBatch({}, {
        workerId: "worker-unknown",
        limit: 1,
      }),
    ).toEqual([{ eventId: event.id, status: "DEAD" }]);
    expect(
      await prisma.integrationOutboxEvent.findUniqueOrThrow({
        where: { id: event.id },
      }),
    ).toMatchObject({ status: "DEAD", attempts: 1 });
  });
});
