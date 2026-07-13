import "server-only";

import { emailOutboxTopics } from "@/domain/integration-topics";
import { prisma } from "@/lib/prisma";

export async function getOutboxHealth(now = new Date()) {
  const thresholdMinutes = Math.max(
    1,
    Number.parseInt(process.env.OUTBOX_BACKLOG_THRESHOLD_MINUTES ?? "15", 10) || 15,
  );
  const overdueBefore = new Date(now.getTime() - thresholdMinutes * 60_000);
  const [total, ready, retry, processing, expiredLeases, dead, overdue, oldest, dueTopics] = await Promise.all([
    prisma.integrationOutboxEvent.count(),
    prisma.integrationOutboxEvent.count({
      where: { status: { in: ["PENDING", "RETRY"] }, availableAt: { lte: now } },
    }),
    prisma.integrationOutboxEvent.count({ where: { status: "RETRY" } }),
    prisma.integrationOutboxEvent.count({ where: { status: "PROCESSING" } }),
    prisma.integrationOutboxEvent.count({
      where: { status: "PROCESSING", leaseExpiresAt: { lte: now } },
    }),
    prisma.integrationOutboxEvent.count({ where: { status: "DEAD" } }),
    prisma.integrationOutboxEvent.count({
      where: {
        status: { in: ["PENDING", "RETRY"] },
        availableAt: { lte: overdueBefore },
      },
    }),
    prisma.integrationOutboxEvent.findFirst({
      where: {
        status: { in: ["PENDING", "RETRY"] },
        availableAt: { lte: now },
      },
      orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
      select: { availableAt: true },
    }),
    prisma.integrationOutboxEvent.groupBy({
      by: ["topic"],
      where: {
        status: { in: ["PENDING", "RETRY"] },
        availableAt: { lte: now },
      },
      _count: { _all: true },
    }),
  ]);

  const activeTopics = new Set<string>(
    process.env.EMAIL_PROVIDER === "smtp" ? emailOutboxTopics : [],
  );
  const unsupportedTopics = dueTopics
    .filter((item) => !activeTopics.has(item.topic))
    .map((item) => ({ topic: item.topic, count: item._count._all }));
  const unsupportedReady = unsupportedTopics.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  return {
    status:
      total === 0
        ? ("empty" as const)
        : dead > 0 || overdue > 0 || expiredLeases > 0 || unsupportedReady > 0
          ? ("degraded" as const)
          : ("ok" as const),
    total,
    ready,
    retry,
    processing,
    expiredLeases,
    dead,
    overdue,
    unsupportedReady,
    unsupportedTopics,
    oldestAvailableAt: oldest?.availableAt ?? null,
    thresholdMinutes,
  };
}
