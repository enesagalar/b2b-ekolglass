import "server-only";

import { getLoginRateLimitConfig } from "@/features/auth/login-rate-limit";
import { prisma } from "@/lib/prisma";

function readBacklogThreshold() {
  const parsed = Number(process.env.AUTH_RATE_LIMIT_EXPIRED_BACKLOG_THRESHOLD);
  return Number.isInteger(parsed) && parsed >= 100 && parsed <= 1_000_000
    ? parsed
    : 1_000;
}

export async function getLoginSecurityHealth(now = new Date()) {
  const config = getLoginRateLimitConfig();
  const since = new Date(now.getTime() - config.windowMinutes * 60_000);
  const [activeFailures, expiredFailures, emailGroups, ipGroups] =
    await Promise.all([
      prisma.authLoginFailure.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.authLoginFailure.count({
        where: { expiresAt: { lte: now } },
      }),
      prisma.authLoginFailure.groupBy({
        by: ["emailKey"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.authLoginFailure.groupBy({
        by: ["ipKey"],
        where: { ipKey: { not: null }, createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

  const emailKeysAtLimit = emailGroups.filter(
    (group) => group._count._all >= config.emailMaxFailures,
  ).length;
  const ipKeysAtLimit = ipGroups.filter(
    (group) => group._count._all >= config.ipMaxFailures,
  ).length;
  const expiredBacklogThreshold = readBacklogThreshold();

  return {
    status:
      emailKeysAtLimit > 0 ||
      ipKeysAtLimit > 0 ||
      expiredFailures >= expiredBacklogThreshold
        ? ("degraded" as const)
        : ("ok" as const),
    activeFailures,
    emailKeysAtLimit,
    ipKeysAtLimit,
    limitedSources: emailKeysAtLimit + ipKeysAtLimit,
    expiredFailures,
    expiredBacklogThreshold,
    windowMinutes: config.windowMinutes,
  };
}

export async function cleanupExpiredLoginFailures(
  trigger: "cron" | "manual" = "cron",
  now = new Date(),
) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.authLoginFailure.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    await tx.auditLog.create({
      data: {
        action: "auth.rate_limit.cleanup",
        entityType: "AuthLoginFailure",
        metadata: JSON.stringify({
          deleted: result.count,
          trigger,
          completedAt: now.toISOString(),
        }),
      },
    });
    return { deleted: result.count, completedAt: now };
  });
}
