import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

export const systemJobKeys = ["EMAIL_OUTBOX", "AUTH_RATE_LIMIT_MAINTENANCE"] as const;
export type SystemJobKey = (typeof systemJobKeys)[number];

const jobLabels: Record<SystemJobKey, string> = {
  EMAIL_OUTBOX: "E-posta outbox worker",
  AUTH_RATE_LIMIT_MAINTENANCE: "Giriş güvenliği bakımı",
};

export class SystemJobBusyError extends Error {}
export class SystemJobLeaseLostError extends Error {}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getSystemJobThresholds(env = process.env) {
  return {
    EMAIL_OUTBOX: positiveInteger(env.OUTBOX_HEARTBEAT_MAX_AGE_MINUTES, 10),
    AUTH_RATE_LIMIT_MAINTENANCE: positiveInteger(env.MAINTENANCE_HEARTBEAT_MAX_AGE_MINUTES, 180),
    leaseMinutes: positiveInteger(env.SYSTEM_JOB_LEASE_MINUTES, 5),
  };
}

export async function beginSystemJobRun(input: {
  runId: string;
  jobKey: SystemJobKey;
  trigger: string;
  correlationId: string;
  startedAt?: Date;
}) {
  const startedAt = input.startedAt ?? new Date();
  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(
    startedAt.getTime() + getSystemJobThresholds().leaseMinutes * 60_000,
  );
  return prisma.$transaction(async (tx) => {
    const existing = await tx.systemJobRun.findUnique({ where: { runId: input.runId } });
    if (existing) return { run: existing, replayed: true };
    await tx.systemJobState.upsert({
      where: { jobKey: input.jobKey },
      create: { jobKey: input.jobKey },
      update: {},
    });
    const acquired = await tx.systemJobState.updateMany({
      where: {
        jobKey: input.jobKey,
        OR: [
          { currentRunId: null },
          { leaseExpiresAt: null },
          { leaseExpiresAt: { lte: startedAt } },
        ],
      },
      data: {
        currentRunId: input.runId,
        leaseToken,
        leaseExpiresAt,
        lastStartedAt: startedAt,
        lastHeartbeatAt: startedAt,
        lastStatus: "RUNNING",
      },
    });
    if (acquired.count !== 1) throw new SystemJobBusyError("Zamanlanmış iş zaten çalışıyor.");
    const run = await tx.systemJobRun.create({
      data: {
        runId: input.runId,
        jobKey: input.jobKey,
        trigger: input.trigger,
        correlationId: input.correlationId,
        leaseToken,
        startedAt,
        heartbeatAt: startedAt,
      },
    });
    return { run, replayed: false };
  });
}

export async function heartbeatSystemJobRun(input: {
  runId: string;
  leaseToken: string;
  heartbeatAt?: Date;
}) {
  const heartbeatAt = input.heartbeatAt ?? new Date();
  const leaseExpiresAt = new Date(
    heartbeatAt.getTime() + getSystemJobThresholds().leaseMinutes * 60_000,
  );
  return prisma.$transaction(async (tx) => {
    const state = await tx.systemJobState.updateMany({
      where: { currentRunId: input.runId, leaseToken: input.leaseToken, lastStatus: "RUNNING" },
      data: { lastHeartbeatAt: heartbeatAt, leaseExpiresAt },
    });
    const run = await tx.systemJobRun.updateMany({
      where: { runId: input.runId, leaseToken: input.leaseToken, status: "RUNNING" },
      data: { heartbeatAt },
    });
    return { updated: state.count === 1 && run.count === 1 };
  });
}

export async function finishSystemJobRun(input: {
  runId: string;
  leaseToken: string;
  status: "SUCCEEDED" | "FAILED";
  resultCount?: number;
  errorCode?: string;
  metadata?: Record<string, unknown>;
  completedAt?: Date;
}) {
  const completedAt = input.completedAt ?? new Date();
  return prisma.$transaction(async (tx) => {
    const run = await tx.systemJobRun.findFirst({
      where: { runId: input.runId, leaseToken: input.leaseToken, status: "RUNNING" },
    });
    if (!run) throw new SystemJobLeaseLostError("Zamanlanmış iş lease kaydı bulunamadı.");
    const durationMs = Math.max(0, completedAt.getTime() - run.startedAt.getTime());
    const state = await tx.systemJobState.updateMany({
      where: { jobKey: run.jobKey, currentRunId: input.runId, leaseToken: input.leaseToken },
      data: {
        currentRunId: null,
        leaseToken: null,
        leaseExpiresAt: null,
        lastHeartbeatAt: completedAt,
        lastCompletedAt: completedAt,
        lastSucceededAt: input.status === "SUCCEEDED" ? completedAt : undefined,
        lastFailedAt: input.status === "FAILED" ? completedAt : undefined,
        lastStatus: input.status,
        consecutiveFailures: input.status === "FAILED" ? { increment: 1 } : 0,
        lastDurationMs: durationMs,
        lastResultCount: input.resultCount,
        lastErrorCode: input.errorCode,
      },
    });
    if (state.count !== 1) throw new SystemJobLeaseLostError("Zamanlanmış iş lease sahibi değişti.");
    await tx.systemJobRun.update({
      where: { id: run.id },
      data: {
        status: input.status,
        heartbeatAt: completedAt,
        completedAt,
        durationMs,
        resultCount: input.resultCount,
        errorCode: input.errorCode,
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      },
    });
    return { updated: true };
  });
}

export async function getSystemJobsHealth(now = new Date()) {
  const thresholds = getSystemJobThresholds();
  const states = await prisma.systemJobState.findMany({
    where: { jobKey: { in: [...systemJobKeys] } },
  });
  const byKey = new Map(states.map((state) => [state.jobKey, state]));
  const jobs = systemJobKeys.map((jobKey) => {
    const enabled = jobKey !== "EMAIL_OUTBOX" || process.env.EMAIL_PROVIDER === "smtp";
    const state = byKey.get(jobKey) ?? null;
    const maxAgeMinutes = thresholds[jobKey];
    if (!enabled) return { jobKey, label: jobLabels[jobKey], status: "disabled" as const, maxAgeMinutes, ageMinutes: null, state };
    if (!state?.lastStatus) return { jobKey, label: jobLabels[jobKey], status: "missing" as const, maxAgeMinutes, ageMinutes: null, state };
    const reference = state.lastCompletedAt ?? state.lastHeartbeatAt ?? state.lastStartedAt;
    const ageMinutes = reference
      ? Math.max(0, Math.floor((now.getTime() - reference.getTime()) / 60_000))
      : null;
    const leaseExpired = state.lastStatus === "RUNNING" && (!state.leaseExpiresAt || state.leaseExpiresAt <= now);
    const status = state.lastStatus === "FAILED"
      ? "failed" as const
      : leaseExpired || (ageMinutes !== null && ageMinutes > maxAgeMinutes)
        ? "stale" as const
        : state.lastStatus === "RUNNING"
          ? "running" as const
          : "ok" as const;
    return { jobKey, label: jobLabels[jobKey], status, maxAgeMinutes, ageMinutes, state };
  });
  return {
    status: jobs.some((job) => ["missing", "failed", "stale"].includes(job.status))
      ? "degraded" as const
      : "ok" as const,
    jobs,
  };
}
