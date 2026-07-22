import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ clientIp: "203.0.113.61" }));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": mocks.clientIp })),
}));

import { activateInvitedAccount } from "@/features/auth/activation-actions";
import { resetDealerPassword } from "@/features/auth/password-reset-actions";
import { prisma } from "@/lib/prisma";

const originalEnvironment = {
  secret: process.env.AUTH_RATE_LIMIT_SECRET,
  trustProxy: process.env.AUTH_TRUST_PROXY,
  clientHeader: process.env.AUTH_CLIENT_IP_HEADER,
  tokenMax: process.env.AUTH_CREDENTIAL_TOKEN_MAX_FAILURES,
  ipMax: process.env.AUTH_CREDENTIAL_IP_MAX_FAILURES,
  globalIpMax: process.env.AUTH_CREDENTIAL_GLOBAL_IP_MAX_FAILURES,
};

function credentialForm() {
  const form = new FormData();
  form.set("token", randomUUID().replaceAll("-", ""));
  form.set("password", "CredentialLimit2026");
  form.set("passwordConfirm", "CredentialLimit2026");
  return form;
}

describe("credential action rotating-token rate limits with SQLite", () => {
  beforeAll(() => {
    process.env.AUTH_RATE_LIMIT_SECRET = "vitest-credential-rate-limit-secret-000001";
    process.env.AUTH_TRUST_PROXY = "true";
    process.env.AUTH_CLIENT_IP_HEADER = "x-forwarded-for";
    process.env.AUTH_CREDENTIAL_TOKEN_MAX_FAILURES = "100";
    process.env.AUTH_CREDENTIAL_IP_MAX_FAILURES = "3";
    process.env.AUTH_CREDENTIAL_GLOBAL_IP_MAX_FAILURES = "100";
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { action: { in: ["auth.activation.failed", "auth.password_reset.failed"] } },
    });
    await prisma.securityRateLimitBucket.deleteMany({
      where: { scope: { in: ["ACCOUNT_ACTIVATION", "PASSWORD_RESET", "AUTH_CREDENTIAL_GLOBAL"] } },
    });
    process.env.AUTH_RATE_LIMIT_SECRET = originalEnvironment.secret;
    process.env.AUTH_TRUST_PROXY = originalEnvironment.trustProxy;
    process.env.AUTH_CLIENT_IP_HEADER = originalEnvironment.clientHeader;
    process.env.AUTH_CREDENTIAL_TOKEN_MAX_FAILURES = originalEnvironment.tokenMax;
    process.env.AUTH_CREDENTIAL_IP_MAX_FAILURES = originalEnvironment.ipMax;
    process.env.AUTH_CREDENTIAL_GLOBAL_IP_MAX_FAILURES = originalEnvironment.globalIpMax;
    await prisma.$disconnect();
  });

  it("blocks activation attempts from one trusted IP even when every token changes", async () => {
    mocks.clientIp = "203.0.113.61";
    const results = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      results.push(await activateInvitedAccount({ ok: false, message: "" }, credentialForm()));
    }

    expect(results.slice(0, 3).every((result) => !result.ok)).toBe(true);
    expect(results[3]?.message).toContain("Çok fazla");
    expect(await prisma.auditLog.count({ where: { action: "auth.activation.failed" } })).toBe(3);
  });

  it("applies the same rotating-token IP boundary to password reset", async () => {
    mocks.clientIp = "198.51.100.61";
    const results = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      results.push(await resetDealerPassword({ ok: false, message: "" }, credentialForm()));
    }

    expect(results.slice(0, 3).every((result) => !result.ok)).toBe(true);
    expect(results[3]?.message).toContain("Çok fazla");
    expect(await prisma.auditLog.count({ where: { action: "auth.password_reset.failed" } })).toBe(3);
    const buckets = await prisma.securityRateLimitBucket.findMany({
      where: { scope: { in: ["ACCOUNT_ACTIVATION", "PASSWORD_RESET", "AUTH_CREDENTIAL_GLOBAL"] } },
    });
    expect(JSON.stringify(buckets)).not.toContain(mocks.clientIp);
  });
});
