import "server-only";

import { createHmac } from "node:crypto";

import { prisma } from "@/lib/prisma";

const DEFAULT_WINDOW_MINUTES = 15;
const DEFAULT_EMAIL_MAX_FAILURES = 8;
const DEFAULT_IP_MAX_FAILURES = 40;
const FAILURE_RETENTION_HOURS = 24;

export type LoginRateLimitContext = {
  emailKey: string;
  ipKey: string | null;
};

type LoginRateLimitConfig = {
  windowMinutes: number;
  emailMaxFailures: number;
  ipMaxFailures: number;
};

function readBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

export function getLoginRateLimitConfig(
  environment: NodeJS.ProcessEnv = process.env,
): LoginRateLimitConfig {
  return {
    windowMinutes: readBoundedInteger(
      environment.AUTH_LOGIN_WINDOW_MINUTES,
      DEFAULT_WINDOW_MINUTES,
      1,
      120,
    ),
    emailMaxFailures: readBoundedInteger(
      environment.AUTH_LOGIN_EMAIL_MAX_FAILURES,
      DEFAULT_EMAIL_MAX_FAILURES,
      3,
      100,
    ),
    ipMaxFailures: readBoundedInteger(
      environment.AUTH_LOGIN_IP_MAX_FAILURES,
      DEFAULT_IP_MAX_FAILURES,
      10,
      500,
    ),
  };
}

function getRateLimitSecret(environment: NodeJS.ProcessEnv = process.env) {
  const secret = environment.AUTH_RATE_LIMIT_SECRET?.trim();
  if (
    secret &&
    secret.length >= 32 &&
    !secret.toLowerCase().includes("replace-with")
  ) {
    return secret;
  }

  if (environment.NODE_ENV !== "production") {
    const developmentFallback = environment.AUTH_SECRET?.trim();
    if (developmentFallback && developmentFallback.length >= 32) {
      return developmentFallback;
    }
  }

  throw new Error("AUTH_RATE_LIMIT_SECRET tanımlanmalıdır.");
}

function createRateLimitKey(
  scope: "email" | "ip",
  value: string,
  environment: NodeJS.ProcessEnv = process.env,
) {
  return createHmac("sha256", getRateLimitSecret(environment))
    .update(`${scope}:${value}`)
    .digest("hex");
}

export function createLoginRateLimitContext(
  email: string,
  ipAddress: string | null,
  environment: NodeJS.ProcessEnv = process.env,
): LoginRateLimitContext {
  return {
    emailKey: createRateLimitKey("email", email.trim().toLowerCase(), environment),
    ipKey: ipAddress
      ? createRateLimitKey("ip", ipAddress, environment)
      : null,
  };
}

export async function checkLoginRateLimit(
  context: LoginRateLimitContext,
  now = new Date(),
) {
  const config = getLoginRateLimitConfig();
  const since = new Date(now.getTime() - config.windowMinutes * 60 * 1000);
  const [emailFailures, ipFailures] = await Promise.all([
    prisma.authLoginFailure.count({
      where: { emailKey: context.emailKey, createdAt: { gte: since } },
    }),
    context.ipKey
      ? prisma.authLoginFailure.count({
          where: { ipKey: context.ipKey, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);

  return {
    limited:
      emailFailures >= config.emailMaxFailures ||
      ipFailures >= config.ipMaxFailures,
    reason:
      emailFailures >= config.emailMaxFailures
        ? "email_limit"
        : ipFailures >= config.ipMaxFailures
          ? "ip_limit"
          : null,
  } as const;
}

export function createLoginFailureData(
  context: LoginRateLimitContext,
  reason: string,
  now = new Date(),
) {
  return {
    emailKey: context.emailKey,
    ipKey: context.ipKey,
    reason,
    expiresAt: new Date(
      now.getTime() + FAILURE_RETENTION_HOURS * 60 * 60 * 1000,
    ),
    createdAt: now,
  };
}
