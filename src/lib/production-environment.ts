import path from "node:path";

import { z } from "zod";

import { getSystemAlertConfig } from "@/integrations/alerts/config";

type RuntimeEnvironment = Record<string, string | undefined>;

export type ProductionEnvironmentIssue = {
  key: string;
  message: string;
};

const requiredSecretKeys = [
  "AUTH_SECRET",
  "AUTH_RATE_LIMIT_SECRET",
  "MAINTENANCE_CRON_SECRET",
  "OUTBOX_CRON_SECRET",
  "BACKUP_CRON_SECRET",
  "SYSTEM_ALERT_CRON_SECRET",
  "SYSTEM_ALERT_WEBHOOK_SECRET",
  "CREDENTIAL_LINK_SECRET",
] as const;

const baseSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  OUTBOX_BASE_URL: z.string().url(),
  MAINTENANCE_BASE_URL: z.string().url(),
  BACKUP_BASE_URL: z.string().url(),
  SYSTEM_ALERT_BASE_URL: z.string().url(),
  DATABASE_BACKUP_ROOT: z.string().min(1),
  SYSTEM_JOB_LEASE_MINUTES: z.coerce.number().int().positive(),
  BACKUP_JOB_LEASE_MINUTES: z.coerce.number().int().positive(),
  OUTBOX_HEARTBEAT_WARN_AFTER_MINUTES: z.coerce.number().int().positive(),
  OUTBOX_HEARTBEAT_MAX_AGE_MINUTES: z.coerce.number().int().positive(),
  MAINTENANCE_HEARTBEAT_WARN_AFTER_MINUTES: z.coerce.number().int().positive(),
  MAINTENANCE_HEARTBEAT_MAX_AGE_MINUTES: z.coerce.number().int().positive(),
  BACKUP_HEARTBEAT_WARN_AFTER_MINUTES: z.coerce.number().int().positive(),
  BACKUP_HEARTBEAT_MAX_AGE_MINUTES: z.coerce.number().int().positive(),
  RETENTION_HEARTBEAT_WARN_AFTER_MINUTES: z.coerce.number().int().positive(),
  RETENTION_HEARTBEAT_MAX_AGE_MINUTES: z.coerce.number().int().positive(),
  SYSTEM_ALERT_HEARTBEAT_WARN_AFTER_MINUTES: z.coerce.number().int().positive(),
  SYSTEM_ALERT_HEARTBEAT_MAX_AGE_MINUTES: z.coerce.number().int().positive(),
  SYSTEM_ALERT_REMINDER_MINUTES: z.coerce.number().int().positive(),
  SYSTEM_ALERT_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000),
  SYSTEM_ALERT_PROVIDER: z.literal("webhook"),
  SYSTEM_ALERT_WEBHOOK_URL: z.string().url(),
  SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS: z.string().min(1),
  SYSTEM_JOB_CRITICAL_AFTER_FAILURES: z.coerce.number().int().positive(),
  SYSTEM_JOB_RUN_SUCCESS_RETENTION_DAYS: z.coerce.number().int().positive(),
  SYSTEM_JOB_RUN_FAILED_RETENTION_DAYS: z.coerce.number().int().positive(),
  SYSTEM_JOB_RETENTION_BATCH_SIZE: z.coerce.number().int().min(100).max(5_000),
  EMAIL_PROVIDER: z.literal("smtp"),
  EMAIL_FROM: z.string().min(3),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_SECURE: z.enum(["true", "false"]),
  SMTP_REQUIRE_TLS: z.literal("true"),
  MEDIA_STORAGE_PROVIDER: z.enum(["LOCAL", "S3"]),
});

function isStrongSecret(value: string | undefined) {
  return Boolean(
    value &&
      value.length >= 32 &&
      !value.toLowerCase().startsWith("replace-with"),
  );
}

function isSecurePublicOrigin(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

export function validateProductionEnvironment(env: RuntimeEnvironment = process.env) {
  const issues: ProductionEnvironmentIssue[] = [];
  const parsed = baseSchema.safeParse(env);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "ENVIRONMENT");
      if (!issues.some((item) => item.key === key)) {
        issues.push({ key, message: "Production değeri eksik veya geçersiz." });
      }
    }
  }

  for (const key of requiredSecretKeys) {
    if (!isStrongSecret(env[key])) {
      issues.push({ key, message: "En az 32 karakterlik, placeholder olmayan secret gerekli." });
    }
  }
  const seenSecrets = new Map<string, string>();
  for (const key of requiredSecretKeys) {
    const value = env[key];
    if (!value) continue;
    const previous = seenSecrets.get(value);
    if (previous) issues.push({ key, message: `Secret ${previous} ile aynı olamaz.` });
    else seenSecrets.set(value, key);
  }

  for (const key of ["NEXT_PUBLIC_SITE_URL", "OUTBOX_BASE_URL", "MAINTENANCE_BASE_URL", "BACKUP_BASE_URL", "SYSTEM_ALERT_BASE_URL"] as const) {
    if (!isSecurePublicOrigin(env[key]) && !issues.some((item) => item.key === key)) {
      issues.push({ key, message: "Production için localhost olmayan HTTPS origin gerekli." });
    }
  }

  if (env.DATABASE_URL === "file:./dev.db") {
    issues.push({ key: "DATABASE_URL", message: "Development veritabanı production'da kullanılamaz." });
  }

  if (env.DATABASE_BACKUP_ROOT && !path.isAbsolute(env.DATABASE_BACKUP_ROOT)) {
    issues.push({ key: "DATABASE_BACKUP_ROOT", message: "Production backup kökü mutlak ve kalıcı volume yolu olmalıdır." });
  }

  const integer = (key: string) => Number.parseInt(env[key] ?? "", 10);
  for (const [leaseKey, warnKey, maxKey] of [
    ["SYSTEM_JOB_LEASE_MINUTES", "OUTBOX_HEARTBEAT_WARN_AFTER_MINUTES", "OUTBOX_HEARTBEAT_MAX_AGE_MINUTES"],
    ["SYSTEM_JOB_LEASE_MINUTES", "MAINTENANCE_HEARTBEAT_WARN_AFTER_MINUTES", "MAINTENANCE_HEARTBEAT_MAX_AGE_MINUTES"],
    ["BACKUP_JOB_LEASE_MINUTES", "BACKUP_HEARTBEAT_WARN_AFTER_MINUTES", "BACKUP_HEARTBEAT_MAX_AGE_MINUTES"],
    ["SYSTEM_JOB_LEASE_MINUTES", "RETENTION_HEARTBEAT_WARN_AFTER_MINUTES", "RETENTION_HEARTBEAT_MAX_AGE_MINUTES"],
    ["SYSTEM_JOB_LEASE_MINUTES", "SYSTEM_ALERT_HEARTBEAT_WARN_AFTER_MINUTES", "SYSTEM_ALERT_HEARTBEAT_MAX_AGE_MINUTES"],
  ] as const) {
    const lease = integer(leaseKey);
    const warn = integer(warnKey);
    const max = integer(maxKey);
    if ([lease, warn, max].every(Number.isInteger) && !(lease < warn && warn < max)) {
      issues.push({ key: warnKey, message: "Scheduler eşikleri lease < warning < critical sırasını izlemelidir." });
    }
  }

  const successRetention = integer("SYSTEM_JOB_RUN_SUCCESS_RETENTION_DAYS");
  const failedRetention = integer("SYSTEM_JOB_RUN_FAILED_RETENTION_DAYS");
  if (Number.isInteger(successRetention) && Number.isInteger(failedRetention) && successRetention > failedRetention) {
    issues.push({ key: "SYSTEM_JOB_RUN_SUCCESS_RETENTION_DAYS", message: "Başarılı iş retention süresi hata geçmişinden uzun olamaz." });
  }

  try {
    getSystemAlertConfig({ ...env, NODE_ENV: "production" });
  } catch {
    if (!issues.some((item) => item.key === "SYSTEM_ALERT_WEBHOOK_URL")) issues.push({ key: "SYSTEM_ALERT_WEBHOOK_URL", message: "Production webhook güvenlik sözleşmesi geçersiz." });
  }

  if (Boolean(env.SMTP_USER?.trim()) !== Boolean(env.SMTP_PASSWORD?.trim())) {
    issues.push({ key: "SMTP_USER", message: "SMTP kullanıcı adı ve parolası birlikte tanımlanmalıdır." });
  }

  if (env.MEDIA_STORAGE_PROVIDER === "S3") {
    for (const key of ["MEDIA_S3_BUCKET", "MEDIA_S3_REGION"] as const) {
      if (!env[key]?.trim()) issues.push({ key, message: "S3 depolama değeri zorunludur." });
    }
    if (Boolean(env.MEDIA_S3_ACCESS_KEY_ID?.trim()) !== Boolean(env.MEDIA_S3_SECRET_ACCESS_KEY?.trim())) {
      issues.push({ key: "MEDIA_S3_ACCESS_KEY_ID", message: "S3 access key ve secret key birlikte tanımlanmalıdır." });
    }
  }

  if (env.CITY_LOJISTIK_ENABLED === "true") {
    issues.push({
      key: "CITY_LOJISTIK_ENABLED",
      message: "Doğrulanmış City Lojistik adapter kabulü tamamlanmadan etkinleştirilemez.",
    });
  }

  return {
    ok: issues.length === 0,
    issues: issues.sort((left, right) => left.key.localeCompare(right.key)),
  };
}
