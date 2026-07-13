import "server-only";

import { z } from "zod";

import { isStrongRuntimeSecret } from "@/lib/secret-policy";

const schema = z.object({
  EMAIL_FROM: z.string().min(3),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_REQUIRE_TLS: z.enum(["true", "false"]).default("true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  OUTBOX_CRON_SECRET: z.string(),
});

export function getEmailConfig() {
  if (process.env.EMAIL_PROVIDER !== "smtp") {
    throw new Error("Transactional e-posta sağlayıcısı etkin değil.");
  }
  const config = schema.parse(process.env);
  const siteUrl = new URL(config.NEXT_PUBLIC_SITE_URL);
  if (process.env.NODE_ENV === "production" && siteUrl.protocol !== "https:") {
    throw new Error("Production e-posta bağlantıları HTTPS origin kullanmalıdır.");
  }
  if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASSWORD)) {
    throw new Error("SMTP kullanıcı adı ve parolası birlikte tanımlanmalıdır.");
  }
  if (!isStrongRuntimeSecret(config.OUTBOX_CRON_SECRET)) {
    throw new Error("Outbox worker secret güvenli değil.");
  }
  return {
    from: config.EMAIL_FROM,
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE === "true",
    requireTls:
      process.env.NODE_ENV === "production" || config.SMTP_REQUIRE_TLS === "true",
    user: config.SMTP_USER,
    password: config.SMTP_PASSWORD,
    siteUrl: siteUrl.origin,
  };
}
