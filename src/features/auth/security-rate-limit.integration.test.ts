import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  consumeSecurityRateLimit,
  createSecurityRateLimitContext,
} from "@/features/auth/security-rate-limit";
import { prisma } from "@/lib/prisma";

const originalEnvironment = {
  secret: process.env.AUTH_RATE_LIMIT_SECRET,
  subjectMax: process.env.AUTH_CREDENTIAL_TOKEN_MAX_FAILURES,
  ipMax: process.env.AUTH_CREDENTIAL_IP_MAX_FAILURES,
  globalIpMax: process.env.AUTH_CREDENTIAL_GLOBAL_IP_MAX_FAILURES,
};

describe("security rate-limit buckets with SQLite", () => {
  beforeAll(() => {
    process.env.AUTH_RATE_LIMIT_SECRET = "vitest-security-rate-limit-secret-00000001";
    process.env.AUTH_CREDENTIAL_TOKEN_MAX_FAILURES = "3";
    process.env.AUTH_CREDENTIAL_IP_MAX_FAILURES = "100";
    process.env.AUTH_CREDENTIAL_GLOBAL_IP_MAX_FAILURES = "100";
  });

  afterAll(async () => {
    await prisma.securityRateLimitBucket.deleteMany({
      where: { scope: { in: ["ACCOUNT_ACTIVATION", "PASSWORD_RESET", "AUTH_CREDENTIAL_GLOBAL"] } },
    });
    process.env.AUTH_RATE_LIMIT_SECRET = originalEnvironment.secret;
    process.env.AUTH_CREDENTIAL_TOKEN_MAX_FAILURES = originalEnvironment.subjectMax;
    process.env.AUTH_CREDENTIAL_IP_MAX_FAILURES = originalEnvironment.ipMax;
    process.env.AUTH_CREDENTIAL_GLOBAL_IP_MAX_FAILURES = originalEnvironment.globalIpMax;
    await prisma.$disconnect();
  });

  it("creates deterministic, domain-separated HMAC keys without raw values", () => {
    const subject = `TOKEN-${randomUUID()}`;
    const ip = "203.0.113.24";
    const first = createSecurityRateLimitContext("ACCOUNT_ACTIVATION", subject, ip);
    const replay = createSecurityRateLimitContext("ACCOUNT_ACTIVATION", subject, ip);
    const reset = createSecurityRateLimitContext("PASSWORD_RESET", subject, ip);

    expect(first).toEqual(replay);
    expect(first.subjectKey).not.toBe(reset.subjectKey);
    expect(first.ipKey).toBe(reset.ipKey);
    expect(JSON.stringify(first)).not.toContain(subject);
    expect(JSON.stringify(first)).not.toContain(ip);
  });

  it("increments one atomic bucket and blocks exactly after the configured threshold", async () => {
    const context = createSecurityRateLimitContext(
      "ACCOUNT_ACTIVATION",
      randomUUID(),
      `198.51.100.${Math.floor(Math.random() * 100) + 1}`,
    );

    const results = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      results.push(await consumeSecurityRateLimit(context));
    }

    expect(results.map((result) => result.limited)).toEqual([false, false, false, true]);
    expect(results.at(-1)).toMatchObject({ reason: "subject_limit", subjectAttempts: 4 });
    expect(await prisma.securityRateLimitBucket.findUniqueOrThrow({
      where: {
        scope_keyType_keyHash: {
          scope: context.scope,
          keyType: "SUBJECT",
          keyHash: context.subjectKey,
        },
      },
    })).toMatchObject({ attemptCount: 4 });
  });
});
