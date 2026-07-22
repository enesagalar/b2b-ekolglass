import "server-only";

import { createHmac, randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const securityRateLimitScopes = [
  "DEALER_APPLICATION",
  "ACCOUNT_ACTIVATION",
  "PASSWORD_RESET",
] as const;

export type SecurityRateLimitScope = (typeof securityRateLimitScopes)[number];
export type SecurityRateLimitContext = {
  scope: SecurityRateLimitScope;
  subjectKey: string;
  ipKey: string;
};

type SecurityRateLimitConfig = {
  windowMinutes: number;
  subjectMaxAttempts: number;
  ipMaxAttempts: number;
  retentionHours: number;
  globalIpMaxAttempts: number | null;
};

type BucketExecutor = Pick<Prisma.TransactionClient, "$queryRaw"> | Pick<PrismaClient, "$queryRaw">;

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function getSecurityRateLimitConfig(
  scope: SecurityRateLimitScope,
  environment: NodeJS.ProcessEnv = process.env,
): SecurityRateLimitConfig {
  if (scope === "DEALER_APPLICATION") {
    return {
      windowMinutes: boundedInteger(environment.DEALER_APPLICATION_WINDOW_MINUTES, 60, 1, 1_440),
      subjectMaxAttempts: boundedInteger(environment.DEALER_APPLICATION_EMAIL_MAX_ATTEMPTS, 3, 2, 100),
      ipMaxAttempts: boundedInteger(environment.DEALER_APPLICATION_IP_MAX_ATTEMPTS, 10, 3, 500),
      retentionHours: 48,
      globalIpMaxAttempts: null,
    };
  }
  return {
    windowMinutes: boundedInteger(environment.AUTH_CREDENTIAL_WINDOW_MINUTES, 15, 1, 120),
    subjectMaxAttempts: boundedInteger(environment.AUTH_CREDENTIAL_TOKEN_MAX_FAILURES, 8, 3, 100),
    ipMaxAttempts: boundedInteger(environment.AUTH_CREDENTIAL_IP_MAX_FAILURES, 20, 3, 500),
    retentionHours: 24,
    globalIpMaxAttempts: boundedInteger(environment.AUTH_CREDENTIAL_GLOBAL_IP_MAX_FAILURES, 40, 5, 1_000),
  };
}

export function getDealerApplicationDuplicateWindowMinutes(environment: NodeJS.ProcessEnv = process.env) {
  return boundedInteger(environment.DEALER_APPLICATION_DUPLICATE_WINDOW_MINUTES, 1_440, 5, 10_080);
}

function rateLimitSecret(environment: NodeJS.ProcessEnv = process.env) {
  const secret = environment.AUTH_RATE_LIMIT_SECRET?.trim();
  if (secret && secret.length >= 32 && !secret.toLowerCase().includes("replace-with")) return secret;
  if (environment.NODE_ENV !== "production") {
    const fallback = environment.AUTH_SECRET?.trim() ?? environment.CREDENTIAL_LINK_SECRET?.trim();
    if (fallback && fallback.length >= 32) return fallback;
  }
  throw new Error("AUTH_RATE_LIMIT_SECRET tanimlanmalidir.");
}

function keyedValue(scope: string, kind: "subject" | "ip", value: string, environment: NodeJS.ProcessEnv) {
  return createHmac("sha256", rateLimitSecret(environment))
    .update(`${scope}:${kind}:${value}`)
    .digest("hex");
}

export function createSecurityRateLimitContext(
  scope: SecurityRateLimitScope,
  subject: string,
  ipAddress: string | null,
  environment: NodeJS.ProcessEnv = process.env,
): SecurityRateLimitContext {
  const ipScope = scope === "DEALER_APPLICATION" ? scope : "AUTH_CREDENTIAL";
  return {
    scope,
    subjectKey: keyedValue(scope, "subject", subject.trim().toLowerCase(), environment),
    ipKey: keyedValue(ipScope, "ip", ipAddress ?? "missing-client-ip", environment),
  };
}

async function incrementBucket(
  executor: BucketExecutor,
  input: {
    scope: SecurityRateLimitScope | "AUTH_CREDENTIAL_GLOBAL";
    keyType: "SUBJECT" | "IP";
    keyHash: string;
    now: Date;
    windowMinutes: number;
    retentionHours: number;
  },
) {
  const windowBoundary = new Date(input.now.getTime() - input.windowMinutes * 60_000);
  const expiresAt = new Date(input.now.getTime() + input.retentionHours * 60 * 60_000);
  const rows = await executor.$queryRaw<Array<{ attemptCount: number | bigint }>>(Prisma.sql`
    INSERT INTO "SecurityRateLimitBucket" (
      "id", "scope", "keyType", "keyHash", "windowStartedAt", "attemptCount",
      "expiresAt", "createdAt", "updatedAt"
    ) VALUES (
      ${randomUUID()}, ${input.scope}, ${input.keyType}, ${input.keyHash}, ${input.now}, 1,
      ${expiresAt}, ${input.now}, ${input.now}
    )
    ON CONFLICT("scope", "keyType", "keyHash") DO UPDATE SET
      "windowStartedAt" = CASE
        WHEN "SecurityRateLimitBucket"."windowStartedAt" <= ${windowBoundary} THEN ${input.now}
        ELSE "SecurityRateLimitBucket"."windowStartedAt"
      END,
      "attemptCount" = CASE
        WHEN "SecurityRateLimitBucket"."windowStartedAt" <= ${windowBoundary} THEN 1
        ELSE "SecurityRateLimitBucket"."attemptCount" + 1
      END,
      "expiresAt" = ${expiresAt},
      "updatedAt" = ${input.now}
    RETURNING "attemptCount"
  `);
  return Number(rows[0]?.attemptCount ?? 0);
}

export async function consumeSecurityRateLimit(
  context: SecurityRateLimitContext,
  now = new Date(),
) {
  const config = getSecurityRateLimitConfig(context.scope);
  return prisma.$transaction(async (tx) => {
    const subjectAttempts = await incrementBucket(tx, {
      scope: context.scope,
      keyType: "SUBJECT",
      keyHash: context.subjectKey,
      now,
      windowMinutes: config.windowMinutes,
      retentionHours: config.retentionHours,
    });
    const ipAttempts = await incrementBucket(tx, {
      scope: context.scope,
      keyType: "IP",
      keyHash: context.ipKey,
      now,
      windowMinutes: config.windowMinutes,
      retentionHours: config.retentionHours,
    });
    const globalIpAttempts = config.globalIpMaxAttempts
      ? await incrementBucket(tx, {
          scope: "AUTH_CREDENTIAL_GLOBAL",
          keyType: "IP",
          keyHash: context.ipKey,
          now,
          windowMinutes: config.windowMinutes,
          retentionHours: config.retentionHours,
        })
      : 0;
    return {
      limited:
        subjectAttempts > config.subjectMaxAttempts ||
        ipAttempts > config.ipMaxAttempts ||
        (config.globalIpMaxAttempts !== null && globalIpAttempts > config.globalIpMaxAttempts),
      reason:
        subjectAttempts > config.subjectMaxAttempts
          ? "subject_limit"
          : ipAttempts > config.ipMaxAttempts
            ? "ip_limit"
            : config.globalIpMaxAttempts !== null && globalIpAttempts > config.globalIpMaxAttempts
              ? "global_ip_limit"
              : null,
      subjectAttempts,
      ipAttempts,
      globalIpAttempts,
    } as const;
  });
}

export async function claimDealerApplicationDeduplication(
  tx: Prisma.TransactionClient,
  emailKey: string,
  now = new Date(),
) {
  const claimToken = randomUUID();
  const expiresAt = new Date(
    now.getTime() + getDealerApplicationDuplicateWindowMinutes() * 60_000,
  );
  const claimed = await tx.$queryRaw<Array<{ claimToken: string; applicationId: string | null }>>(Prisma.sql`
    INSERT INTO "DealerApplicationDeduplication" (
      "emailKey", "claimToken", "applicationId", "acceptedAt", "expiresAt", "createdAt", "updatedAt"
    ) VALUES (${emailKey}, ${claimToken}, NULL, ${now}, ${expiresAt}, ${now}, ${now})
    ON CONFLICT("emailKey") DO UPDATE SET
      "claimToken" = ${claimToken},
      "applicationId" = NULL,
      "acceptedAt" = ${now},
      "expiresAt" = ${expiresAt},
      "updatedAt" = ${now}
    WHERE "DealerApplicationDeduplication"."expiresAt" <= ${now}
    RETURNING "claimToken", "applicationId"
  `);

  if (claimed[0]?.claimToken === claimToken) {
    return { claimed: true as const, claimToken };
  }

  const existing = await tx.dealerApplicationDeduplication.findUnique({
    where: { emailKey },
    select: { applicationId: true },
  });
  return { claimed: false as const, applicationId: existing?.applicationId ?? null };
}

export async function completeDealerApplicationDeduplication(
  tx: Prisma.TransactionClient,
  input: { emailKey: string; claimToken: string; applicationId: string },
) {
  const completed = await tx.dealerApplicationDeduplication.updateMany({
    where: {
      emailKey: input.emailKey,
      claimToken: input.claimToken,
      applicationId: null,
    },
    data: { applicationId: input.applicationId },
  });
  if (completed.count !== 1) throw new Error("DEALER_APPLICATION_CLAIM_LOST");
}
