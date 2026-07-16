import "server-only";

import { systemAlertOutboxTopic } from "@/domain/integration-topics";
import { enqueueIntegrationEvent } from "@/integrations/outbox";
import { prisma } from "@/lib/prisma";
import { getSystemJobsHealth } from "@/lib/system-jobs";

import type { SystemAlertPayload } from "./types";

type SystemJobsHealth = Awaited<ReturnType<typeof getSystemJobsHealth>>;
type MonitoredJob = SystemJobsHealth["jobs"][number];

function reminderMinutes() {
  const parsed = Number.parseInt(process.env.SYSTEM_ALERT_REMINDER_MINUTES ?? "360", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 360;
}

function reasonCode(job: MonitoredJob) {
  return job.state?.lastErrorCode ? `${job.status.toUpperCase()}:${job.state.lastErrorCode}`.slice(0, 100) : job.status.toUpperCase();
}

export async function reconcileSystemAlerts(health: SystemJobsHealth, now = new Date()) {
  const jobs = health.jobs.filter((job) => job.jobKey !== "SYSTEM_ALERT_DISPATCH");
  return prisma.$transaction(async (tx) => {
    const queued: Array<{ jobKey: string; eventType: SystemAlertPayload["eventType"] }> = [];
    for (const job of jobs) {
      const current = await tx.systemAlertState.findUnique({ where: { jobKey: job.jobKey } });
      const observedSeverity = job.severity;
      const correlationId = job.lastRun?.correlationId ?? null;
      let eventType: SystemAlertPayload["eventType"] | null = null;
      if (observedSeverity === "none") {
        if (current?.status !== "ACTIVE") continue;
        eventType = "RECOVERED";
      } else if (!current || current.status === "RESOLVED") {
        eventType = "OPENED";
      } else if (observedSeverity === "critical" && current.lastQueuedSeverity !== "critical") {
        eventType = "ESCALATED";
      } else if (
        observedSeverity === "critical" && current.lastQueuedAt &&
        current.lastQueuedAt <= new Date(now.getTime() - reminderMinutes() * 60_000)
      ) {
        eventType = "REMINDER";
      }

      const nextVersion = (current?.version ?? 0) + (eventType ? 1 : 0);
      const priorSeverity = (current?.currentSeverity ?? "none") as SystemAlertPayload["priorSeverity"];
      const nextStatus = observedSeverity === "none" ? "RESOLVED" : "ACTIVE";
      await tx.systemAlertState.upsert({
        where: { jobKey: job.jobKey },
        create: {
          jobKey: job.jobKey,
          status: nextStatus,
          currentSeverity: observedSeverity,
          lastQueuedSeverity: eventType && observedSeverity !== "none" ? observedSeverity : null,
          lastEventType: eventType,
          reasonCode: reasonCode(job),
          correlationId,
          openedAt: observedSeverity !== "none" ? now : null,
          resolvedAt: observedSeverity === "none" ? now : null,
          lastObservedAt: now,
          lastQueuedAt: eventType ? now : null,
          version: nextVersion,
        },
        update: {
          status: nextStatus,
          currentSeverity: observedSeverity,
          lastQueuedSeverity: eventType && observedSeverity !== "none" ? observedSeverity : undefined,
          lastEventType: eventType ?? undefined,
          reasonCode: reasonCode(job),
          correlationId,
          openedAt: current?.status === "RESOLVED" && observedSeverity !== "none" ? now : undefined,
          resolvedAt: observedSeverity === "none" ? now : null,
          lastObservedAt: now,
          lastQueuedAt: eventType ? now : undefined,
          version: nextVersion,
        },
      });
      if (!eventType) continue;
      const payload: SystemAlertPayload = {
        schemaVersion: 1,
        eventType,
        jobKey: job.jobKey,
        jobLabel: job.label,
        severity: observedSeverity,
        priorSeverity,
        jobStatus: job.status,
        reasonCode: reasonCode(job),
        fingerprint: `${job.jobKey}:${reasonCode(job)}`,
        observedAt: now.toISOString(),
        correlationId,
        version: nextVersion,
      };
      await enqueueIntegrationEvent(tx, {
        topic: systemAlertOutboxTopic,
        eventType: `system.alert.${eventType.toLowerCase()}.v1`,
        aggregateType: "SYSTEM_JOB",
        aggregateId: job.jobKey,
        payload,
        idempotencyKey: `system-alert:${job.jobKey}:${nextVersion}:${eventType}`,
        maxAttempts: 8,
      });
      queued.push({ jobKey: job.jobKey, eventType });
    }
    return queued;
  });
}
