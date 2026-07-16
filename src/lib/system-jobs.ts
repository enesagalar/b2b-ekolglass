import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

export const systemJobKeys = [
  "EMAIL_OUTBOX",
  "AUTH_RATE_LIMIT_MAINTENANCE",
  "DATABASE_BACKUP",
  "SYSTEM_JOB_RETENTION",
  "SYSTEM_ALERT_DISPATCH",
] as const;
export type SystemJobKey = (typeof systemJobKeys)[number];

const jobLabels: Record<SystemJobKey, string> = {
  EMAIL_OUTBOX: "E-posta outbox worker",
  AUTH_RATE_LIMIT_MAINTENANCE: "Giriş güvenliği bakımı",
  DATABASE_BACKUP: "Veritabanı yedekleme",
  SYSTEM_JOB_RETENTION: "İş geçmişi temizliği",
  SYSTEM_ALERT_DISPATCH: "Sistem alarm dağıtımı",
};

export class SystemJobBusyError extends Error {}
export class SystemJobLeaseLostError extends Error {}
export class SystemJobReplayConflictError extends Error {}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getSystemJobThresholds(env = process.env) {
  return {
    EMAIL_OUTBOX: {
      warnAfterMinutes: positiveInteger(env.OUTBOX_HEARTBEAT_WARN_AFTER_MINUTES, 6),
      maxAgeMinutes: positiveInteger(env.OUTBOX_HEARTBEAT_MAX_AGE_MINUTES, 10),
    },
    AUTH_RATE_LIMIT_MAINTENANCE: {
      warnAfterMinutes: positiveInteger(env.MAINTENANCE_HEARTBEAT_WARN_AFTER_MINUTES, 90),
      maxAgeMinutes: positiveInteger(env.MAINTENANCE_HEARTBEAT_MAX_AGE_MINUTES, 180),
    },
    DATABASE_BACKUP: {
      warnAfterMinutes: positiveInteger(env.BACKUP_HEARTBEAT_WARN_AFTER_MINUTES, 1_500),
      maxAgeMinutes: positiveInteger(env.BACKUP_HEARTBEAT_MAX_AGE_MINUTES, 2_160),
    },
    SYSTEM_JOB_RETENTION: {
      warnAfterMinutes: positiveInteger(env.RETENTION_HEARTBEAT_WARN_AFTER_MINUTES, 1_500),
      maxAgeMinutes: positiveInteger(env.RETENTION_HEARTBEAT_MAX_AGE_MINUTES, 2_160),
    },
    SYSTEM_ALERT_DISPATCH: {
      warnAfterMinutes: positiveInteger(env.SYSTEM_ALERT_HEARTBEAT_WARN_AFTER_MINUTES, 6),
      maxAgeMinutes: positiveInteger(env.SYSTEM_ALERT_HEARTBEAT_MAX_AGE_MINUTES, 10),
    },
    leaseMinutes: positiveInteger(env.SYSTEM_JOB_LEASE_MINUTES, 5),
    backupLeaseMinutes: positiveInteger(env.BACKUP_JOB_LEASE_MINUTES, 30),
    criticalAfterFailures: positiveInteger(env.SYSTEM_JOB_CRITICAL_AFTER_FAILURES, 3),
    successRetentionDays: positiveInteger(env.SYSTEM_JOB_RUN_SUCCESS_RETENTION_DAYS, 14),
    failedRetentionDays: positiveInteger(env.SYSTEM_JOB_RUN_FAILED_RETENTION_DAYS, 90),
    retentionBatchSize: positiveInteger(env.SYSTEM_JOB_RETENTION_BATCH_SIZE, 1_000),
  };
}

function leaseMinutesFor(jobKey: SystemJobKey) {
  const thresholds = getSystemJobThresholds();
  return jobKey === "DATABASE_BACKUP" ? thresholds.backupLeaseMinutes : thresholds.leaseMinutes;
}

export async function pruneSystemJobRuns(now = new Date()) {
  const thresholds = getSystemJobThresholds();
  const policies = [
    { status: "SUCCEEDED", days: thresholds.successRetentionDays },
    { status: "FAILED", days: thresholds.failedRetentionDays },
  ] as const;
  let deleted = 0;
  const byStatus: Record<(typeof policies)[number]["status"], number> = {
    SUCCEEDED: 0,
    FAILED: 0,
  };
  for (const policy of policies) {
    const cutoff = new Date(now.getTime() - policy.days * 24 * 60 * 60_000);
    const expired = await prisma.systemJobRun.findMany({
      where: { status: policy.status, completedAt: { lt: cutoff } },
      orderBy: { completedAt: "asc" },
      take: thresholds.retentionBatchSize,
      select: { id: true },
    });
    if (!expired.length) continue;
    const result = await prisma.systemJobRun.deleteMany({
      where: { id: { in: expired.map((run) => run.id) }, status: policy.status },
    });
    byStatus[policy.status] = result.count;
    deleted += result.count;
  }
  return { deleted, byStatus };
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
  const leaseExpiresAt = new Date(startedAt.getTime() + leaseMinutesFor(input.jobKey) * 60_000);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.systemJobRun.findUnique({ where: { runId: input.runId } });
    if (existing) {
      if (existing.jobKey !== input.jobKey || existing.trigger !== input.trigger || existing.correlationId !== input.correlationId) {
        throw new SystemJobReplayConflictError("Run kimliği farklı bir iş için kullanılmış.");
      }
      return { run: existing, replayed: true };
    }
    const previousState = await tx.systemJobState.upsert({
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
    if (previousState.currentRunId && previousState.currentRunId !== input.runId) {
      await tx.systemJobRun.updateMany({
        where: { runId: previousState.currentRunId, status: "RUNNING" },
        data: { status: "FAILED", completedAt: startedAt, heartbeatAt: startedAt, errorCode: "LEASE_EXPIRED" },
      });
    }
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
  return prisma.$transaction(async (tx) => {
    const owner = await tx.systemJobState.findFirst({
      where: {
        currentRunId: input.runId,
        leaseToken: input.leaseToken,
        lastStatus: "RUNNING",
        leaseExpiresAt: { gt: heartbeatAt },
      },
      select: { jobKey: true },
    });
    if (!owner) throw new SystemJobLeaseLostError("Zamanlanmış iş lease süresi dolmuş veya sahibi değişmiş.");
    const leaseExpiresAt = new Date(heartbeatAt.getTime() + leaseMinutesFor(owner.jobKey as SystemJobKey) * 60_000);
    const state = await tx.systemJobState.updateMany({
      where: { currentRunId: input.runId, leaseToken: input.leaseToken, lastStatus: "RUNNING", leaseExpiresAt: { gt: heartbeatAt } },
      data: { lastHeartbeatAt: heartbeatAt, leaseExpiresAt },
    });
    const run = await tx.systemJobRun.updateMany({
      where: { runId: input.runId, leaseToken: input.leaseToken, status: "RUNNING" },
      data: { heartbeatAt },
    });
    if (state.count !== 1 || run.count !== 1) {
      throw new SystemJobLeaseLostError("Zamanlanmış iş heartbeat kaydı atomik olarak güncellenemedi.");
    }
    return { updated: true };
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
      where: { jobKey: run.jobKey, currentRunId: input.runId, leaseToken: input.leaseToken, leaseExpiresAt: { gt: completedAt } },
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
  const [states, latestRuns] = await Promise.all([
    prisma.systemJobState.findMany({ where: { jobKey: { in: [...systemJobKeys] } } }),
    Promise.all(systemJobKeys.map((jobKey) => prisma.systemJobRun.findFirst({
      where: { jobKey },
      orderBy: { startedAt: "desc" },
      select: { runId: true, correlationId: true, status: true, startedAt: true, completedAt: true },
    }))),
  ]);
  const byKey = new Map(states.map((state) => [state.jobKey, state]));
  const latestRunByKey = new Map(systemJobKeys.map((jobKey, index) => [jobKey, latestRuns[index]]));
  const jobs = systemJobKeys.map((jobKey) => {
    const enabled = jobKey === "EMAIL_OUTBOX"
      ? process.env.EMAIL_PROVIDER === "smtp"
      : jobKey === "SYSTEM_ALERT_DISPATCH"
        ? process.env.SYSTEM_ALERT_PROVIDER === "webhook"
        : true;
    const state = byKey.get(jobKey) ?? null;
    const lastRun = latestRunByKey.get(jobKey) ?? null;
    const { warnAfterMinutes, maxAgeMinutes } = thresholds[jobKey];
    if (!enabled) return { jobKey, label: jobLabels[jobKey], status: "disabled" as const, severity: "none" as const, warnAfterMinutes, maxAgeMinutes, ageMinutes: null, state, lastRun };
    if (!state?.lastStatus) return { jobKey, label: jobLabels[jobKey], status: "missing" as const, severity: "critical" as const, warnAfterMinutes, maxAgeMinutes, ageMinutes: null, state, lastRun };
    const reference = state.lastStatus === "RUNNING"
      ? state.lastHeartbeatAt ?? state.lastStartedAt
      : state.lastCompletedAt ?? state.lastHeartbeatAt ?? state.lastStartedAt;
    const ageMinutes = reference
      ? Math.max(0, Math.floor((now.getTime() - reference.getTime()) / 60_000))
      : null;
    const leaseExpired = state.lastStatus === "RUNNING" && (!state.leaseExpiresAt || state.leaseExpiresAt <= now);
    const status = state.lastStatus === "FAILED"
      ? "failed" as const
      : leaseExpired || (ageMinutes !== null && ageMinutes > maxAgeMinutes)
        ? "stale" as const
        : ageMinutes !== null && ageMinutes > warnAfterMinutes
          ? "late" as const
        : state.lastStatus === "RUNNING"
          ? "running" as const
          : "ok" as const;
    const severity = status === "stale" || (status === "failed" && state.consecutiveFailures >= thresholds.criticalAfterFailures)
      ? "critical" as const
      : status === "late" || status === "failed"
        ? "warning" as const
        : "none" as const;
    return { jobKey, label: jobLabels[jobKey], status, severity, warnAfterMinutes, maxAgeMinutes, ageMinutes, state, lastRun };
  });
  return {
    status: jobs.some((job) => job.severity !== "none")
      ? "degraded" as const
      : "ok" as const,
    alertLevel: jobs.some((job) => job.severity === "critical")
      ? "critical" as const
      : jobs.some((job) => job.severity === "warning")
        ? "warning" as const
        : "none" as const,
    jobs,
  };
}
