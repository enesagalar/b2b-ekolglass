import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const productionEnvironment = {
  NODE_ENV: "production",
  APP_COMMIT_SHA: "a".repeat(40),
  APP_ARTIFACT_DIGEST: `sha256:${"b".repeat(64)}`,
  APP_RELEASE_ID: "preflight-entrypoint-test",
  DATABASE_URL: "file:/data/database/production.db",
  NEXT_PUBLIC_SITE_URL: "https://portal.ekolglass.com",
  OUTBOX_BASE_URL: "https://portal.ekolglass.com",
  MAINTENANCE_BASE_URL: "https://portal.ekolglass.com",
  BACKUP_BASE_URL: "https://portal.ekolglass.com",
  SYSTEM_ALERT_BASE_URL: "https://portal.ekolglass.com",
  DATABASE_BACKUP_ROOT: "/data/backups",
  BACKUP_OFFSITE_PROVIDER: "S3",
  BACKUP_S3_BUCKET: "preflight-backups",
  BACKUP_S3_REGION: "eu-central-1",
  BACKUP_S3_SERVER_SIDE_ENCRYPTION: "AES256",
  BACKUP_S3_UPLOAD_TIMEOUT_MS: "120000",
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
  SYSTEM_ALERT_HEARTBEAT_WARN_AFTER_MINUTES: "6",
  SYSTEM_ALERT_HEARTBEAT_MAX_AGE_MINUTES: "10",
  SYSTEM_ALERT_REMINDER_MINUTES: "360",
  SYSTEM_ALERT_TIMEOUT_MS: "10000",
  SYSTEM_ALERT_PROVIDER: "webhook",
  SYSTEM_ALERT_WEBHOOK_URL: "https://alerts.example.com/ekolglass",
  SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS: "alerts.example.com",
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
  MEDIA_LOCAL_ROOT: "/data/media",
  AUTH_TRUST_PROXY: "true",
  AUTH_CLIENT_IP_HEADER: "x-forwarded-for",
  AUTH_SECRET: "auth-secret-".padEnd(48, "a"),
  AUTH_RATE_LIMIT_SECRET: "rate-limit-secret-".padEnd(48, "b"),
  MAINTENANCE_CRON_SECRET: "maintenance-secret-".padEnd(48, "c"),
  OUTBOX_CRON_SECRET: "outbox-secret-".padEnd(48, "d"),
  BACKUP_CRON_SECRET: "backup-secret-".padEnd(48, "e"),
  SYSTEM_ALERT_CRON_SECRET: "alert-cron-secret-".padEnd(48, "f"),
  SYSTEM_ALERT_WEBHOOK_SECRET: "alert-webhook-secret-".padEnd(48, "g"),
  CREDENTIAL_LINK_SECRET: "credential-secret-".padEnd(48, "h"),
  CITY_LOJISTIK_ENABLED: "false",
};

test("production preflight CLI reaches and passes environment validation", async () => {
  const executable = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  const { stdout, stderr } = await execFileAsync(process.execPath, [executable, "scripts/production-preflight.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, ...productionEnvironment },
    windowsHide: true,
  });

  assert.equal(stderr, "");
  assert.deepEqual(JSON.parse(stdout), { status: "ready", checks: ["environment"] });
});
