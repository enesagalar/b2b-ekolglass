import { z } from "zod";

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
  "CREDENTIAL_LINK_SECRET",
] as const;

const baseSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  OUTBOX_BASE_URL: z.string().url(),
  MAINTENANCE_BASE_URL: z.string().url(),
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

  for (const key of ["NEXT_PUBLIC_SITE_URL", "OUTBOX_BASE_URL", "MAINTENANCE_BASE_URL"] as const) {
    if (!isSecurePublicOrigin(env[key]) && !issues.some((item) => item.key === key)) {
      issues.push({ key, message: "Production için localhost olmayan HTTPS origin gerekli." });
    }
  }

  if (env.DATABASE_URL === "file:./dev.db") {
    issues.push({ key: "DATABASE_URL", message: "Development veritabanı production'da kullanılamaz." });
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
