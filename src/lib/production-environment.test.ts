import { describe, expect, it } from "vitest";

import { validateProductionEnvironment } from "./production-environment";

const validEnvironment = {
  DATABASE_URL: "file:/var/lib/ekolglass/production.db",
  NEXT_PUBLIC_SITE_URL: "https://portal.ekolglass.com",
  OUTBOX_BASE_URL: "https://portal.ekolglass.com",
  MAINTENANCE_BASE_URL: "https://portal.ekolglass.com",
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
});
