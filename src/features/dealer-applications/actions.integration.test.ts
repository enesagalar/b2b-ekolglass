import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clientIp: "203.0.113.41",
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": mocks.clientIp })),
}));

import { createDealerApplication } from "@/features/dealer-applications/actions";
import { prisma } from "@/lib/prisma";

const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const originalEnvironment = {
  secret: process.env.AUTH_RATE_LIMIT_SECRET,
  trustProxy: process.env.AUTH_TRUST_PROXY,
  clientHeader: process.env.AUTH_CLIENT_IP_HEADER,
  emailMax: process.env.DEALER_APPLICATION_EMAIL_MAX_ATTEMPTS,
  ipMax: process.env.DEALER_APPLICATION_IP_MAX_ATTEMPTS,
};

function applicationForm(email: string) {
  const form = new FormData();
  form.set("companyName", `Rate Limit Cam ${suffix}`);
  form.set("contactName", "Test Yetkilisi");
  form.set("email", email);
  form.set("phone", "+90 212 555 01 01");
  form.set("city", "İstanbul");
  form.set("customerType", "Oto cam bayisi");
  return form;
}

describe("public dealer application abuse controls with SQLite", () => {
  beforeAll(() => {
    process.env.AUTH_RATE_LIMIT_SECRET = "vitest-dealer-rate-limit-secret-000000001";
    process.env.AUTH_TRUST_PROXY = "true";
    process.env.AUTH_CLIENT_IP_HEADER = "x-forwarded-for";
    process.env.DEALER_APPLICATION_EMAIL_MAX_ATTEMPTS = "100";
    process.env.DEALER_APPLICATION_IP_MAX_ATTEMPTS = "100";
  });

  afterAll(async () => {
    const applications = await prisma.dealerApplication.findMany({
      where: { email: { contains: suffix } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: { action: "dealer.application.created", entityId: { in: applications.map((item) => item.id) } },
    });
    await prisma.dealerApplication.deleteMany({ where: { email: { contains: suffix } } });
    await prisma.dealerApplicationDeduplication.deleteMany({});
    await prisma.securityRateLimitBucket.deleteMany({ where: { scope: "DEALER_APPLICATION" } });
    process.env.AUTH_RATE_LIMIT_SECRET = originalEnvironment.secret;
    process.env.AUTH_TRUST_PROXY = originalEnvironment.trustProxy;
    process.env.AUTH_CLIENT_IP_HEADER = originalEnvironment.clientHeader;
    process.env.DEALER_APPLICATION_EMAIL_MAX_ATTEMPTS = originalEnvironment.emailMax;
    process.env.DEALER_APPLICATION_IP_MAX_ATTEMPTS = originalEnvironment.ipMax;
    await prisma.$disconnect();
  });

  it("returns one durable application for repeated and concurrent duplicate submissions", async () => {
    mocks.clientIp = "203.0.113.41";
    const email = `duplicate-${suffix}@example.com`;
    const first = await createDealerApplication({ ok: false, message: "" }, applicationForm(email.toUpperCase()));
    const concurrent = await Promise.all(
      Array.from({ length: 5 }, () =>
        createDealerApplication({ ok: false, message: "" }, applicationForm(email)),
      ),
    );

    expect(first.ok).toBe(true);
    expect(concurrent.every((result) => result.ok)).toBe(true);
    expect(new Set([first.reference, ...concurrent.map((result) => result.reference)]).size).toBe(1);
    const application = await prisma.dealerApplication.findFirstOrThrow({ where: { email } });
    expect(await prisma.dealerApplication.count({ where: { email } })).toBe(1);
    expect(await prisma.auditLog.count({
      where: { action: "dealer.application.created", entityType: "DealerApplication", entityId: application.id },
    })).toBe(1);
  });

  it("limits different emails from one trusted IP without storing the raw IP", async () => {
    process.env.DEALER_APPLICATION_EMAIL_MAX_ATTEMPTS = "100";
    process.env.DEALER_APPLICATION_IP_MAX_ATTEMPTS = "3";
    mocks.clientIp = "198.51.100.77";
    const results = [];
    for (let index = 0; index < 4; index += 1) {
      results.push(await createDealerApplication(
        { ok: false, message: "" },
        applicationForm(`ip-${index}-${suffix}@example.com`),
      ));
    }

    expect(results.map((result) => result.ok)).toEqual([true, true, true, false]);
    const buckets = await prisma.securityRateLimitBucket.findMany({ where: { scope: "DEALER_APPLICATION" } });
    expect(JSON.stringify(buckets)).not.toContain(mocks.clientIp);
  });

  it("rolls back the application and duplicate claim when audit persistence fails", async () => {
    process.env.DEALER_APPLICATION_EMAIL_MAX_ATTEMPTS = "100";
    process.env.DEALER_APPLICATION_IP_MAX_ATTEMPTS = "100";
    mocks.clientIp = "192.0.2.88";
    const email = `rollback-${suffix}@example.com`;
    const triggerName = `dealer_application_audit_rollback_${Date.now()}`;

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerName}"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW."action" = 'dealer.application.created'
      BEGIN
        SELECT RAISE(ABORT, 'forced dealer application audit failure');
      END;
    `);
    try {
      const result = await createDealerApplication(
        { ok: false, message: "" },
        applicationForm(email),
      );
      expect(result.ok).toBe(false);
      expect(result.message).not.toContain("forced dealer application audit failure");
      expect(await prisma.dealerApplication.count({ where: { email } })).toBe(0);
      expect(await prisma.dealerApplicationDeduplication.count({
        where: { applicationId: null },
      })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}"`);
    }
  });
});
