import { afterEach, describe, expect, it } from "vitest";

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

afterEach(async () => {
  const events = await prisma.integrationOutboxEvent.findMany({ where: { idempotencyKey: { startsWith: prefix } }, select: { id: true } });
  const ids = events.map((event) => event.id);
  if (ids.length) {
    await prisma.integrationLog.deleteMany({ where: { outboxEventId: { in: ids } } });
    await prisma.integrationReplayCommand.deleteMany({ where: { outboxEventId: { in: ids } } });
    await prisma.integrationOutboxEvent.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.systemAlertState.deleteMany({ where: { jobKey } });
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

  it("enforces lifecycle constraints at database level", async () => {
    await expect(prisma.$executeRawUnsafe(`INSERT INTO "SystemAlertState" ("jobKey", "status", "currentSeverity", "lastObservedAt", "updatedAt") VALUES (?, 'ACTIVE', 'none', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, jobKey)).rejects.toThrow();
  });
});
