import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  failureCount: vi.fn(),
  failureDeleteMany: vi.fn(),
  failureGroupBy: vi.fn(),
  securityFindMany: vi.fn(),
  securityCount: vi.fn(),
  securityDeleteMany: vi.fn(),
  duplicateCount: vi.fn(),
  duplicateDeleteMany: vi.fn(),
}));

vi.mock("@/features/auth/login-rate-limit", () => ({
  getLoginRateLimitConfig: () => ({
    windowMinutes: 15,
    emailMaxFailures: 8,
    ipMaxFailures: 40,
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback) => callback({
      auditLog: { create: mocks.auditCreate },
      authLoginFailure: { deleteMany: mocks.failureDeleteMany },
      securityRateLimitBucket: { deleteMany: mocks.securityDeleteMany },
      dealerApplicationDeduplication: { deleteMany: mocks.duplicateDeleteMany },
    })),
    authLoginFailure: {
      count: mocks.failureCount,
      groupBy: mocks.failureGroupBy,
    },
    securityRateLimitBucket: {
      findMany: mocks.securityFindMany,
      count: mocks.securityCount,
    },
    dealerApplicationDeduplication: { count: mocks.duplicateCount },
  },
}));

import {
  cleanupExpiredLoginFailures,
  getLoginSecurityHealth,
} from "./rate-limit-operations";

describe("rate-limit operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.failureCount.mockResolvedValue(0);
    mocks.failureGroupBy.mockResolvedValue([]);
    mocks.failureDeleteMany.mockResolvedValue({ count: 0 });
    mocks.securityFindMany.mockResolvedValue([]);
    mocks.securityCount.mockResolvedValue(0);
    mocks.duplicateCount.mockResolvedValue(0);
    mocks.securityDeleteMany.mockResolvedValue({ count: 0 });
    mocks.duplicateDeleteMany.mockResolvedValue({ count: 0 });
    mocks.auditCreate.mockResolvedValue({});
  });

  it("reports healthy status when no limiter source reached its threshold", async () => {
    mocks.failureCount.mockResolvedValueOnce(4).mockResolvedValueOnce(0);
    mocks.failureGroupBy
      .mockResolvedValueOnce([{ emailKey: "email-1", _count: { _all: 4 } }])
      .mockResolvedValueOnce([{ ipKey: "ip-1", _count: { _all: 4 } }]);

    const health = await getLoginSecurityHealth(
      new Date("2026-07-14T12:00:00.000Z"),
    );

    expect(health.status).toBe("ok");
    expect(health.activeFailures).toBe(4);
    expect(health.limitedSources).toBe(0);
  });

  it("reports degraded status for email/IP limits or expired cleanup backlog", async () => {
    mocks.failureCount.mockResolvedValueOnce(50).mockResolvedValueOnce(1_000);
    mocks.failureGroupBy
      .mockResolvedValueOnce([{ emailKey: "email-1", _count: { _all: 8 } }])
      .mockResolvedValueOnce([{ ipKey: "ip-1", _count: { _all: 40 } }]);

    const health = await getLoginSecurityHealth();

    expect(health.status).toBe("degraded");
    expect(health.emailKeysAtLimit).toBe(1);
    expect(health.ipKeysAtLimit).toBe(1);
    expect(health.limitedSources).toBe(2);
    expect(health.expiredFailures).toBe(1_000);
  });

  it("reports indexed public and credential buckets that reached their limit", async () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    mocks.securityFindMany.mockResolvedValue([
      {
        scope: "ACCOUNT_ACTIVATION",
        keyType: "SUBJECT",
        attemptCount: 8,
        windowStartedAt: new Date("2026-07-22T11:55:00.000Z"),
      },
    ]);

    const health = await getLoginSecurityHealth(now);

    expect(health.status).toBe("degraded");
    expect(health.securityActiveBuckets).toBe(1);
    expect(health.securityKeysAtLimit).toBe(1);
    expect(health.limitedSources).toBe(1);
  });

  it("deletes only expired records and writes a system audit entry", async () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    mocks.failureDeleteMany.mockResolvedValue({ count: 27 });
    mocks.securityDeleteMany.mockResolvedValue({ count: 4 });
    mocks.duplicateDeleteMany.mockResolvedValue({ count: 2 });

    const result = await cleanupExpiredLoginFailures("cron", now);

    expect(result).toEqual({
      deleted: 33,
      loginDeleted: 27,
      securityBucketsDeleted: 4,
      duplicateClaimsDeleted: 2,
      completedAt: now,
    });
    expect(mocks.failureDeleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: now } },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "auth.rate_limit.cleanup",
        entityType: "AuthLoginFailure",
        metadata: expect.stringContaining('"deleted":33'),
      }),
    });
  });
});
