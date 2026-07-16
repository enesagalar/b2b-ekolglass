import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { beginSystemJobRun, finishSystemJobRun, getSystemJobsHealth, SystemJobBusyError } from "./system-jobs";

const runIds: string[] = [];

afterEach(async () => {
  await prisma.systemJobRun.deleteMany({ where: { runId: { in: runIds } } });
  await prisma.systemJobState.deleteMany({ where: { jobKey: { in: ["EMAIL_OUTBOX", "AUTH_RATE_LIMIT_MAINTENANCE"] } } });
  runIds.length = 0;
  vi.unstubAllEnvs();
});

describe("system job runs", () => {
  it("records one idempotent run and its completion metrics", async () => {
    const runId = randomUUID();
    runIds.push(runId);
    const startedAt = new Date("2026-07-16T10:00:00.000Z");
    const first = await beginSystemJobRun({
      runId,
      jobKey: "EMAIL_OUTBOX",
      trigger: "cron",
      correlationId: runId,
      startedAt,
    });
    const replay = await beginSystemJobRun({
      runId,
      jobKey: "EMAIL_OUTBOX",
      trigger: "cron",
      correlationId: runId,
      startedAt,
    });
    await finishSystemJobRun({
      runId,
      leaseToken: first.run.leaseToken,
      status: "SUCCEEDED",
      resultCount: 4,
      completedAt: new Date("2026-07-16T10:00:02.500Z"),
    });

    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(await prisma.systemJobRun.findUniqueOrThrow({ where: { runId } })).toMatchObject({
      status: "SUCCEEDED",
      durationMs: 2_500,
      resultCount: 4,
    });
  });

  it("marks failed and stale scheduler runs as degraded", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    vi.stubEnv("OUTBOX_HEARTBEAT_MAX_AGE_MINUTES", "5");
    const outboxRunId = randomUUID();
    const maintenanceRunId = randomUUID();
    runIds.push(outboxRunId, maintenanceRunId);
    const outboxRun = await beginSystemJobRun({
      runId: outboxRunId,
      jobKey: "EMAIL_OUTBOX",
      trigger: "cron",
      correlationId: outboxRunId,
      startedAt: new Date("2026-07-16T09:00:00.000Z"),
    });
    await finishSystemJobRun({
      runId: outboxRunId,
      leaseToken: outboxRun.run.leaseToken,
      status: "SUCCEEDED",
      completedAt: new Date("2026-07-16T09:00:01.000Z"),
    });
    const maintenanceRun = await beginSystemJobRun({
      runId: maintenanceRunId,
      jobKey: "AUTH_RATE_LIMIT_MAINTENANCE",
      trigger: "cron",
      correlationId: maintenanceRunId,
      startedAt: new Date("2026-07-16T09:09:00.000Z"),
    });
    await finishSystemJobRun({
      runId: maintenanceRunId,
      leaseToken: maintenanceRun.run.leaseToken,
      status: "FAILED",
      errorCode: "MAINTENANCE_FAILED",
      completedAt: new Date("2026-07-16T09:09:01.000Z"),
    });

    const health = await getSystemJobsHealth(new Date("2026-07-16T09:10:00.000Z"));
    expect(health.status).toBe("degraded");
    expect(health.jobs.find((job) => job.jobKey === "EMAIL_OUTBOX")?.status).toBe("stale");
    expect(health.jobs.find((job) => job.jobKey === "AUTH_RATE_LIMIT_MAINTENANCE")?.status).toBe("failed");
  });

  it("rejects a parallel run while the current lease is active", async () => {
    const firstRunId = randomUUID();
    const secondRunId = randomUUID();
    runIds.push(firstRunId, secondRunId);
    await beginSystemJobRun({
      runId: firstRunId,
      jobKey: "EMAIL_OUTBOX",
      trigger: "cron",
      correlationId: firstRunId,
    });

    await expect(beginSystemJobRun({
      runId: secondRunId,
      jobKey: "EMAIL_OUTBOX",
      trigger: "cron",
      correlationId: secondRunId,
    })).rejects.toBeInstanceOf(SystemJobBusyError);
  });
});
