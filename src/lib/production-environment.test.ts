import { describe, expect, it } from "vitest";

import { validateProductionEnvironment } from "./production-environment";

const validEnvironment = {
  DATABASE_URL: "file:/var/lib/ekolglass/production.db",
  NEXT_PUBLIC_SITE_URL: "https://portal.ekolglass.com",
  OUTBOX_BASE_URL: "https://portal.ekolglass.com",
  MAINTENANCE_BASE_URL: "https://portal.ekolglass.com",
  BACKUP_BASE_URL: "https://portal.ekolglass.com",
  DATABASE_BACKUP_ROOT: "/var/lib/ekolglass/backups",
  SYSTEM_JOB_LEASE_MINUTES: "5",
  BACKUP_JOB_LEASE_MINUTES: "30",
  OUTBOX_HEARTBEAT_WARN_AFTER_MINUTES: "6",
  OUTBOX_HEARTBEAT_MAX_AGE_MINUTES: "10",
  MAINTENANCE_HEARTBEAT_WARN_AFTER_MINUTES: "90",
  MAINTENANCE_HEARTBEAT_MAX_AGE_MINUTES: "180",
  BACKUP_HEARTBEAT_WARN_AFTER_MINUTES: "1500",
  BACKUP_HEARTBEAT_MAX_AGE_MINUTES: "2160",
  RETENTION_HEARTBEAT_WARN_AFTER_MINUTES: "1500",
  RETENTION_HEARTBEAT_MAX_AGE_MINUTES: "2160",
  SYSTEM_JOB_CRITICAL_AFTER_FAILURES: "3",
  SYSTEM_JOB_RUN_SUCCESS_RETENTION_DAYS: "14",
  SYSTEM_JOB_RUN_FAILED_RETENTION_DAYS: "90",
  SYSTEM_JOB_RETENTION_BATCH_SIZE: "1000",
  EMAIL_PROVIDER: "smtp",
  EMAIL_FROM: "EkolGlass B2B <b2b@ekolglass.com>",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_REQUIRE_TLS: "true",
  MEDIA_STORAGE_PROVIDER: "LOCAL",
  AUTH_SECRET: "a".repeat(48),
  AUTH_RATE_LIMIT_SECRET: "b".repeat(48),
  MAINTENANCE_CRON_SECRET: "c".repeat(48),
  OUTBOX_CRON_SECRET: "d".repeat(48),
  BACKUP_CRON_SECRET: "f".repeat(48),
  CREDENTIAL_LINK_SECRET: "e".repeat(48),
  CITY_LOJISTIK_ENABLED: "false",
};

describe("validateProductionEnvironment", () => {
  it("accepts a complete production configuration while City is disabled", () => {
    expect(validateProductionEnvironment(validEnvironment)).toEqual({ ok: true, issues: [] });
  });

  it("reports only setting names and never secret values", () => {
    const result = validateProductionEnvironment({
      ...validEnvironment,
      AUTH_SECRET: "replace-with-leaked-secret",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.key)).toEqual(
      expect.arrayContaining(["AUTH_SECRET", "NEXT_PUBLIC_SITE_URL"]),
    );
    expect(JSON.stringify(result)).not.toContain("replace-with-leaked-secret");
  });

  it("blocks an accidental City activation before the verified adapter exists", () => {
    const result = validateProductionEnvironment({
      ...validEnvironment,
      CITY_LOJISTIK_ENABLED: "true",
    });

    expect(result).toMatchObject({ ok: false });
    expect(result.issues).toContainEqual(expect.objectContaining({ key: "CITY_LOJISTIK_ENABLED" }));
  });

  it("rejects invalid scheduler ordering and relative backup storage", () => {
    const result = validateProductionEnvironment({
      ...validEnvironment,
      DATABASE_BACKUP_ROOT: "./backups",
      BACKUP_JOB_LEASE_MINUTES: "1600",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.key)).toEqual(
      expect.arrayContaining(["DATABASE_BACKUP_ROOT", "BACKUP_HEARTBEAT_WARN_AFTER_MINUTES"]),
    );
  });
});
