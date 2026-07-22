import "server-only";

import { getLoginRateLimitConfig } from "@/features/auth/login-rate-limit";
import {
  getSecurityRateLimitConfig,
  type SecurityRateLimitScope,
} from "@/features/auth/security-rate-limit";
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
  const [activeFailures, expiredLoginFailures, emailGroups, ipGroups, securityBuckets, expiredSecurityBuckets, expiredDuplicateClaims] =
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
      prisma.securityRateLimitBucket.findMany({
        where: { expiresAt: { gt: now } },
        select: { scope: true, keyType: true, attemptCount: true, windowStartedAt: true },
      }),
      prisma.securityRateLimitBucket.count({ where: { expiresAt: { lte: now } } }),
      prisma.dealerApplicationDeduplication.count({ where: { expiresAt: { lte: now } } }),
    ]);

  const emailKeysAtLimit = emailGroups.filter(
    (group) => group._count._all >= config.emailMaxFailures,
  ).length;
  const ipKeysAtLimit = ipGroups.filter(
    (group) => group._count._all >= config.ipMaxFailures,
  ).length;
  const expiredBacklogThreshold = readBacklogThreshold();
  const activeSecurityBuckets = securityBuckets.filter((bucket) => {
    if (bucket.scope === "AUTH_CREDENTIAL_GLOBAL") {
      const config = getSecurityRateLimitConfig("ACCOUNT_ACTIVATION");
      return bucket.windowStartedAt >= new Date(now.getTime() - config.windowMinutes * 60_000);
    }
    const config = getSecurityRateLimitConfig(bucket.scope as SecurityRateLimitScope);
    return bucket.windowStartedAt >= new Date(now.getTime() - config.windowMinutes * 60_000);
  });
  const securityKeysAtLimit = activeSecurityBuckets.filter((bucket) => {
    if (bucket.scope === "AUTH_CREDENTIAL_GLOBAL") {
      return bucket.attemptCount >= (getSecurityRateLimitConfig("ACCOUNT_ACTIVATION").globalIpMaxAttempts ?? Infinity);
    }
    const config = getSecurityRateLimitConfig(bucket.scope as SecurityRateLimitScope);
    return bucket.attemptCount >= (bucket.keyType === "SUBJECT" ? config.subjectMaxAttempts : config.ipMaxAttempts);
  }).length;
  const expiredFailures = expiredLoginFailures + expiredSecurityBuckets + expiredDuplicateClaims;

  return {
    status:
      emailKeysAtLimit > 0 ||
      ipKeysAtLimit > 0 ||
      securityKeysAtLimit > 0 ||
      expiredFailures >= expiredBacklogThreshold
        ? ("degraded" as const)
        : ("ok" as const),
    activeFailures,
    emailKeysAtLimit,
    ipKeysAtLimit,
    limitedSources: emailKeysAtLimit + ipKeysAtLimit + securityKeysAtLimit,
    securityActiveBuckets: activeSecurityBuckets.length,
    securityKeysAtLimit,
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
    const loginResult = await tx.authLoginFailure.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    const securityResult = await tx.securityRateLimitBucket.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    const duplicateResult = await tx.dealerApplicationDeduplication.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    const deleted = loginResult.count + securityResult.count + duplicateResult.count;
    await tx.auditLog.create({
      data: {
        action: "auth.rate_limit.cleanup",
        entityType: "AuthLoginFailure",
        metadata: JSON.stringify({
          deleted,
          loginDeleted: loginResult.count,
          securityBucketsDeleted: securityResult.count,
          duplicateClaimsDeleted: duplicateResult.count,
          trigger,
          completedAt: now.toISOString(),
        }),
      },
    });
    return {
      deleted,
      loginDeleted: loginResult.count,
      securityBucketsDeleted: securityResult.count,
      duplicateClaimsDeleted: duplicateResult.count,
      completedAt: now,
    };
  });
}
