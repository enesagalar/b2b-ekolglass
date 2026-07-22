import { isIP } from "node:net";

import { z } from "zod";

import { isStrongRuntimeSecret } from "@/lib/secret-policy";

const schema = z.object({
  SYSTEM_ALERT_WEBHOOK_URL: z.string().url(),
  SYSTEM_ALERT_WEBHOOK_SECRET: z.string(),
  SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS: z.string().min(1),
  SYSTEM_ALERT_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(10_000),
});

type AlertEnvironment = Record<string, string | undefined>;

function privateIpLiteral(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const version = isIP(normalized);
  if (!version) return false;
  if (version === 6) {
    if (normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized) || normalized.startsWith("ff")) return true;
    const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    return mapped ? privateIpLiteral(mapped) : false;
  }
  const [first, second, third] = normalized.split(".").map(Number);
  return first === 0 || first === 10 || first === 127 || first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && (third === 0 || third === 2)) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113);
}

export function getSystemAlertConfig(env: AlertEnvironment = process.env) {
  if (env.SYSTEM_ALERT_PROVIDER !== "webhook") throw new Error("Sistem alarm webhook sağlayıcısı etkin değil.");
  const config = schema.parse(env);
  if (!isStrongRuntimeSecret(config.SYSTEM_ALERT_WEBHOOK_SECRET)) throw new Error("Sistem alarm webhook secret güvenli değil.");
  const url = new URL(config.SYSTEM_ALERT_WEBHOOK_URL);
  const allowedHosts = new Set(config.SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
  if (url.username || url.password || url.search || url.hash) throw new Error("Sistem alarm webhook URL kimlik bilgisi, query veya fragment içeremez.");
  if (!allowedHosts.has(url.hostname.toLowerCase())) throw new Error("Sistem alarm webhook host allowlist dışında.");
  if (privateIpLiteral(url.hostname)) throw new Error("Sistem alarm webhook özel IP adresi kullanamaz.");
  if (env.NODE_ENV === "production" && (url.protocol !== "https:" || (url.port && url.port !== "443"))) {
    throw new Error("Production sistem alarm webhook'u HTTPS/443 kullanmalıdır.");
  }
  if (env.NODE_ENV !== "production" && !["http:", "https:"].includes(url.protocol)) throw new Error("Sistem alarm webhook protokolü geçersiz.");
  return { url, secret: config.SYSTEM_ALERT_WEBHOOK_SECRET, timeoutMs: config.SYSTEM_ALERT_TIMEOUT_MS };
}

export function getSystemAlertReadiness(env: AlertEnvironment = process.env) {
  if (env.SYSTEM_ALERT_PROVIDER !== "webhook") {
    return { enabled: false, provider: "disabled" as const, status: "disabled" as const };
  }
  try {
    getSystemAlertConfig(env);
    return { enabled: true, provider: "webhook" as const, status: "ready" as const };
  } catch {
    return { enabled: true, provider: "webhook" as const, status: "blocked" as const };
  }
}
