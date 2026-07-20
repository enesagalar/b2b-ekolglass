import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { reconcileSystemAlerts } from "./service";

const jobKey = "TEST_SYSTEM_ALERT_JOB";
const prefix = `system-alert:${jobKey}:`;

function health(severity: "none" | "warning" | "critical", status = severity === "none" ? "ok" : "failed") {
  return {
    status: severity === "none" ? "ok" : "degraded",
    alertLevel: severity,
    jobs: [{
      jobKey,
      label: "Test scheduler işi",
      status,
      severity,
      warnAfterMinutes: 5,
      maxAgeMinutes: 10,
      ageMinutes: 12,
      state: { lastErrorCode: "TEST_FAILURE" },
      lastRun: { correlationId: "11111111-1111-4111-8111-111111111111" },
    }],
  } as unknown as Parameters<typeof reconcileSystemAlerts>[0];
}

beforeEach(() => {
  process.env.SYSTEM_ALERT_REMINDER_MINUTES = "10";
});

afterEach(async () => {
  const events = await prisma.integrationOutboxEvent.findMany({ where: { idempotencyKey: { startsWith: prefix } }, select: { id: true } });
  const ids = events.map((event) => event.id);
  if (ids.length) {
    await prisma.integrationLog.deleteMany({ where: { outboxEventId: { in: ids } } });
    await prisma.integrationReplayCommand.deleteMany({ where: { outboxEventId: { in: ids } } });
    await prisma.integrationOutboxEvent.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.systemAlertState.deleteMany({ where: { jobKey } });
  delete process.env.SYSTEM_ALERT_REMINDER_MINUTES;
});

describe("system alert reconciliation", () => {
  it("queues open, escalation and recovery once per transition", async () => {
    expect(await reconcileSystemAlerts(health("warning"), new Date("2026-07-16T20:00:00.000Z"))).toHaveLength(1);
    expect(await reconcileSystemAlerts(health("warning"), new Date("2026-07-16T20:01:00.000Z"))).toHaveLength(0);
    expect(await reconcileSystemAlerts(health("critical"), new Date("2026-07-16T20:02:00.000Z"))).toHaveLength(1);
    expect(await reconcileSystemAlerts(health("none"), new Date("2026-07-16T20:03:00.000Z"))).toHaveLength(1);
    expect(await reconcileSystemAlerts(health("none"), new Date("2026-07-16T20:04:00.000Z"))).toHaveLength(0);

    const events = await prisma.integrationOutboxEvent.findMany({ where: { idempotencyKey: { startsWith: prefix } }, orderBy: { createdAt: "asc" }, select: { eventType: true } });
    expect(events.map((event) => event.eventType)).toEqual(["system.alert.opened.v1", "system.alert.escalated.v1", "system.alert.recovered.v1"]);
  });

  it("deduplicates concurrent evaluators", async () => {
    await Promise.all(Array.from({ length: 10 }, () => reconcileSystemAlerts(health("critical"), new Date("2026-07-16T20:00:00.000Z"))));
    expect(await prisma.integrationOutboxEvent.count({ where: { idempotencyKey: { startsWith: prefix } } })).toBe(1);
    expect((await prisma.systemAlertState.findUniqueOrThrow({ where: { jobKey } })).version).toBe(1);
  });

  it("queues reminders exactly at the configured interval and only once per interval", async () => {
    const openedAt = new Date("2026-07-16T20:00:00.000Z");
    expect(await reconcileSystemAlerts(health("critical"), openedAt)).toEqual([{ jobKey, eventType: "OPENED" }]);
    expect(await reconcileSystemAlerts(health("critical"), new Date("2026-07-16T20:09:59.999Z"))).toHaveLength(0);
    expect(await reconcileSystemAlerts(health("critical"), new Date("2026-07-16T20:10:00.000Z"))).toEqual([{ jobKey, eventType: "REMINDER" }]);
    expect(await reconcileSystemAlerts(health("critical"), new Date("2026-07-16T20:10:00.000Z"))).toHaveLength(0);
    expect(await reconcileSystemAlerts(health("critical"), new Date("2026-07-16T20:19:59.999Z"))).toHaveLength(0);
    expect(await reconcileSystemAlerts(health("critical"), new Date("2026-07-16T20:20:00.000Z"))).toEqual([{ jobKey, eventType: "REMINDER" }]);

    const events = await prisma.integrationOutboxEvent.findMany({
      where: { idempotencyKey: { startsWith: prefix } },
      orderBy: { idempotencyKey: "asc" },
      select: { eventType: true, idempotencyKey: true, payload: true },
    });
    expect(events.map((event) => event.eventType)).toEqual([
      "system.alert.opened.v1",
      "system.alert.reminder.v1",
      "system.alert.reminder.v1",
    ]);
    expect(events.map((event) => event.idempotencyKey)).toEqual([
      `${prefix}1:OPENED`,
      `${prefix}2:REMINDER`,
      `${prefix}3:REMINDER`,
    ]);
    expect(events.map((event) => JSON.parse(event.payload).version)).toEqual([1, 2, 3]);

    expect(await prisma.systemAlertState.findUniqueOrThrow({ where: { jobKey } })).toMatchObject({
      status: "ACTIVE",
      currentSeverity: "critical",
      lastQueuedSeverity: "critical",
      lastEventType: "REMINDER",
      lastQueuedAt: new Date("2026-07-16T20:20:00.000Z"),
      version: 3,
    });
  });

  it("reopens a recovered alert with a new lifecycle version without duplicating observations", async () => {
    const firstOpenedAt = new Date("2026-07-16T20:00:00.000Z");
    const recoveredAt = new Date("2026-07-16T20:01:00.000Z");
    const reopenedAt = new Date("2026-07-16T20:02:00.000Z");

    expect(await reconcileSystemAlerts(health("warning"), firstOpenedAt)).toEqual([{ jobKey, eventType: "OPENED" }]);
    expect(await reconcileSystemAlerts(health("none"), recoveredAt)).toEqual([{ jobKey, eventType: "RECOVERED" }]);
    expect(await reconcileSystemAlerts(health("critical"), reopenedAt)).toEqual([{ jobKey, eventType: "OPENED" }]);
    expect(await reconcileSystemAlerts(health("critical"), reopenedAt)).toHaveLength(0);

    const state = await prisma.systemAlertState.findUniqueOrThrow({ where: { jobKey } });
    expect(state).toMatchObject({
      status: "ACTIVE",
      currentSeverity: "critical",
      lastQueuedSeverity: "critical",
      lastEventType: "OPENED",
      openedAt: reopenedAt,
      resolvedAt: null,
      lastObservedAt: reopenedAt,
      lastQueuedAt: reopenedAt,
      version: 3,
    });
    expect(await prisma.integrationOutboxEvent.count({ where: { idempotencyKey: { startsWith: prefix } } })).toBe(3);
  });

  it("queues a new escalation after a critical alert de-escalates to warning", async () => {
    expect(await reconcileSystemAlerts(health("warning"), new Date("2026-07-16T20:00:00.000Z"))).toEqual([{ jobKey, eventType: "OPENED" }]);
    expect(await reconcileSystemAlerts(health("critical"), new Date("2026-07-16T20:01:00.000Z"))).toEqual([{ jobKey, eventType: "ESCALATED" }]);
    expect(await reconcileSystemAlerts(health("warning"), new Date("2026-07-16T20:02:00.000Z"))).toHaveLength(0);
    expect(await reconcileSystemAlerts(health("critical"), new Date("2026-07-16T20:03:00.000Z"))).toEqual([{ jobKey, eventType: "ESCALATED" }]);
    expect(await reconcileSystemAlerts(health("critical"), new Date("2026-07-16T20:03:00.000Z"))).toHaveLength(0);

    const events = await prisma.integrationOutboxEvent.findMany({
      where: { idempotencyKey: { startsWith: prefix } },
      orderBy: { idempotencyKey: "asc" },
      select: { eventType: true, idempotencyKey: true },
    });
    expect(events).toEqual([
      { eventType: "system.alert.opened.v1", idempotencyKey: `${prefix}1:OPENED` },
      { eventType: "system.alert.escalated.v1", idempotencyKey: `${prefix}2:ESCALATED` },
      { eventType: "system.alert.escalated.v1", idempotencyKey: `${prefix}3:ESCALATED` },
    ]);
  });

  it("enforces lifecycle constraints at database level", async () => {
    await expect(prisma.$executeRawUnsafe(`INSERT INTO "SystemAlertState" ("jobKey", "status", "currentSeverity", "lastObservedAt", "updatedAt") VALUES (?, 'ACTIVE', 'none', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, jobKey)).rejects.toThrow();
  });
});
