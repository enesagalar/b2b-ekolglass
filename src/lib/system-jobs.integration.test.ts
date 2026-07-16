import { randomUUID } from "node:crypto";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { beginSystemJobRun, finishSystemJobRun, getSystemJobsHealth, heartbeatSystemJobRun, pruneSystemJobRuns, systemJobKeys, SystemJobBusyError, SystemJobLeaseLostError } from "./system-jobs";

const runIds: string[] = [];
let originalStates: Awaited<ReturnType<typeof prisma.systemJobState.findMany>> = [];

beforeAll(async () => {
  originalStates = await prisma.systemJobState.findMany({ where: { jobKey: { in: [...systemJobKeys] } } });
});

afterEach(async () => {
  await prisma.systemJobRun.deleteMany({ where: { runId: { in: runIds } } });
  await prisma.systemJobState.deleteMany({ where: { jobKey: { in: [...systemJobKeys] } } });
  if (originalStates.length) await prisma.systemJobState.createMany({ data: originalStates });
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
    const attempts = await Promise.allSettled([firstRunId, secondRunId].map((runId) => beginSystemJobRun({
      runId,
      jobKey: "DATABASE_BACKUP",
      trigger: "cron",
      correlationId: runId,
    })));
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((result) => result.status === "rejected" && result.reason instanceof SystemJobBusyError)).toHaveLength(1);
  });

  it("rejects heartbeat and completion after lease expiry", async () => {
    const runId = randomUUID();
    runIds.push(runId);
    const run = await beginSystemJobRun({ runId, jobKey: "EMAIL_OUTBOX", trigger: "cron", correlationId: runId, startedAt: new Date("2026-07-16T10:00:00.000Z") });

    await expect(heartbeatSystemJobRun({ runId, leaseToken: run.run.leaseToken, heartbeatAt: new Date("2026-07-16T10:06:00.000Z") })).rejects.toBeInstanceOf(SystemJobLeaseLostError);
    await expect(finishSystemJobRun({ runId, leaseToken: run.run.leaseToken, status: "SUCCEEDED", completedAt: new Date("2026-07-16T10:06:00.000Z") })).rejects.toBeInstanceOf(SystemJobLeaseLostError);
  });

  it("deletes only expired completed runs within the retention batch", async () => {
    vi.stubEnv("SYSTEM_JOB_RUN_SUCCESS_RETENTION_DAYS", "14");
    vi.stubEnv("SYSTEM_JOB_RUN_FAILED_RETENTION_DAYS", "90");
    vi.stubEnv("SYSTEM_JOB_RETENTION_BATCH_SIZE", "100");
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    runIds.push(...ids);
    await prisma.systemJobRun.createMany({ data: [
      { runId: ids[0], jobKey: "EMAIL_OUTBOX", status: "SUCCEEDED", trigger: "test", correlationId: ids[0], leaseToken: "done", startedAt: new Date("2025-01-01"), heartbeatAt: new Date("2025-01-01"), completedAt: new Date("2025-01-01") },
      { runId: ids[1], jobKey: "EMAIL_OUTBOX", status: "FAILED", trigger: "test", correlationId: ids[1], leaseToken: "failed", startedAt: new Date("2026-07-01"), heartbeatAt: new Date("2026-07-01"), completedAt: new Date("2026-07-01") },
      { runId: ids[2], jobKey: "EMAIL_OUTBOX", status: "RUNNING", trigger: "test", correlationId: ids[2], leaseToken: "running", startedAt: new Date("2025-01-01"), heartbeatAt: new Date("2025-01-01") },
    ] });

    const result = await pruneSystemJobRuns(new Date("2026-07-16T12:00:00.000Z"));
    expect(result).toEqual({ deleted: 1, byStatus: { SUCCEEDED: 1, FAILED: 0 } });
    expect(await prisma.systemJobRun.findMany({ where: { runId: { in: ids } }, select: { runId: true } })).toHaveLength(2);
  });

  it("raises warning and critical levels from age and consecutive failures", async () => {
    const backupRunId = randomUUID();
    const retentionRunId = randomUUID();
    runIds.push(backupRunId, retentionRunId);
    const backup = await beginSystemJobRun({ runId: backupRunId, jobKey: "DATABASE_BACKUP", trigger: "cron", correlationId: backupRunId, startedAt: new Date("2026-07-15T10:00:00.000Z") });
    await finishSystemJobRun({ runId: backupRunId, leaseToken: backup.run.leaseToken, status: "SUCCEEDED", completedAt: new Date("2026-07-15T10:01:00.000Z") });
    const retention = await beginSystemJobRun({ runId: retentionRunId, jobKey: "SYSTEM_JOB_RETENTION", trigger: "cron", correlationId: retentionRunId, startedAt: new Date("2026-07-16T11:00:00.000Z") });
    await finishSystemJobRun({ runId: retentionRunId, leaseToken: retention.run.leaseToken, status: "FAILED", completedAt: new Date("2026-07-16T11:01:00.000Z") });
    await prisma.systemJobState.update({ where: { jobKey: "SYSTEM_JOB_RETENTION" }, data: { consecutiveFailures: 3 } });

    const health = await getSystemJobsHealth(new Date("2026-07-16T11:02:00.000Z"));
    expect(health.jobs.find((job) => job.jobKey === "DATABASE_BACKUP")).toMatchObject({ status: "late", severity: "warning" });
    expect(health.jobs.find((job) => job.jobKey === "SYSTEM_JOB_RETENTION")).toMatchObject({ status: "failed", severity: "critical" });
    expect(health.alertLevel).toBe("critical");
  });
});
