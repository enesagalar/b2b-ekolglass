import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  failureCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    authLoginFailure: { count: mocks.failureCount },
  },
}));

import {
  checkLoginRateLimit,
  createLoginFailureData,
  createLoginRateLimitContext,
  getLoginRateLimitConfig,
} from "./login-rate-limit";

const environment = {
  NODE_ENV: "test",
  AUTH_RATE_LIMIT_SECRET: "test-rate-limit-secret-with-32-bytes",
} satisfies NodeJS.ProcessEnv;

describe("login rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.failureCount.mockResolvedValue(0);
  });

  it("creates deterministic scope-separated HMAC keys without storing raw values", () => {
    const first = createLoginRateLimitContext(
      "Dealer@Example.com",
      "203.0.113.10",
      environment,
    );
    const second = createLoginRateLimitContext(
      "dealer@example.com",
      "203.0.113.10",
      environment,
    );

    expect(first).toEqual(second);
    expect(first.emailKey).toHaveLength(64);
    expect(first.ipKey).toHaveLength(64);
    expect(first.emailKey).not.toContain("dealer@example.com");
    expect(first.emailKey).not.toBe(first.ipKey);
  });

  it("uses safe defaults when environment limits are invalid", () => {
    expect(getLoginRateLimitConfig({
      NODE_ENV: "test",
      AUTH_LOGIN_WINDOW_MINUTES: "0",
      AUTH_LOGIN_EMAIL_MAX_FAILURES: "not-a-number",
      AUTH_LOGIN_IP_MAX_FAILURES: "900",
    })).toEqual({
      windowMinutes: 15,
      emailMaxFailures: 8,
      ipMaxFailures: 40,
    });
  });

  it("fails closed when production uses a missing or placeholder secret", () => {
    expect(() => createLoginRateLimitContext("dealer@example.com", null, {
      NODE_ENV: "production",
      AUTH_RATE_LIMIT_SECRET: "replace-with-a-long-secret",
    })).toThrow("AUTH_RATE_LIMIT_SECRET");
  });

  it("blocks independently on email and IP thresholds", async () => {
    mocks.failureCount.mockResolvedValueOnce(8).mockResolvedValueOnce(2);
    const emailLimited = await checkLoginRateLimit({
      emailKey: "email-key",
      ipKey: "ip-key",
    });

    mocks.failureCount.mockResolvedValueOnce(1).mockResolvedValueOnce(40);
    const ipLimited = await checkLoginRateLimit({
      emailKey: "other-email-key",
      ipKey: "ip-key",
    });

    expect(emailLimited).toEqual({ limited: true, reason: "email_limit" });
    expect(ipLimited).toEqual({ limited: true, reason: "ip_limit" });
  });

  it("skips the IP query when no trusted client IP exists", async () => {
    await checkLoginRateLimit({ emailKey: "email-key", ipKey: null });

    expect(mocks.failureCount).toHaveBeenCalledOnce();
    expect(mocks.failureCount).toHaveBeenCalledWith({
      where: {
        emailKey: "email-key",
        createdAt: { gte: expect.any(Date) },
      },
    });
  });

  it("creates expiring failure records with no raw credentials", () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    const data = createLoginFailureData(
      { emailKey: "email-key", ipKey: "ip-key" },
      "invalid_password",
      now,
    );

    expect(data).toEqual({
      emailKey: "email-key",
      ipKey: "ip-key",
      reason: "invalid_password",
      createdAt: now,
      expiresAt: new Date("2026-07-15T12:00:00.000Z"),
    });
  });
});
