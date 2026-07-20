const sensitiveKeyPattern = /authorization|cookie|password|secret|token|api[-_]?key|credential/i;
const maxLogBytes = 8_192;

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function sanitizeText(value: string) {
  return value
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/Basic\s+[^\s,;]+/gi, "Basic [REDACTED]")
    .replace(/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s]+/gi, "[DATABASE_URL_REDACTED]")
    .replace(/\bhttps?:\/\/[^\s/@:]+:[^\s/@]+@/gi, "https://[REDACTED]@")
    .replace(/([?&](?:token|secret|api[_-]?key|password|x-amz-(?:credential|signature|security-token))=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL_REDACTED]")
    .replace(/(?<!\d)(?:\+?90\s*)?(?:0\s*)?5\d{2}(?:[\s.-]*\d{3})(?:[\s.-]*\d{2})(?:[\s.-]*\d{2})(?!\d)/g, "[PHONE_REDACTED]")
    .slice(0, 1_000);
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (value instanceof Error) {
    const digest = "digest" in value ? String(value.digest) : undefined;
    return {
      name: value.name,
      message: sanitizeText(value.message),
      ...(digest ? { digest: sanitizeText(digest) } : {}),
    };
  }
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 50)
        .map(([key, item]) => [
          key,
          sensitiveKeyPattern.test(key) ? "[REDACTED]" : sanitizeValue(item, depth + 1),
        ]),
    );
  }
  return String(value);
}

export function getCorrelationId() {
  return globalThis.crypto.randomUUID();
}

export function structuredLog(level: LogLevel, event: string, context: LogContext = {}) {
  try {
    const record = {
      ...(sanitizeValue(context) as LogContext),
      timestamp: new Date().toISOString(),
      level,
      event: sanitizeText(event),
    };
    let output = JSON.stringify(record);
    if (new TextEncoder().encode(output).byteLength > maxLogBytes) {
      output = JSON.stringify({ timestamp: record.timestamp, level, event: record.event, truncated: true });
    }
    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    else console.info(output);
  } catch {
    console.error(JSON.stringify({ level: "error", event: "logger.serialization_failed" }));
  }
}

export function correlationHeaders(correlationId: string) {
  return { "x-request-id": correlationId };
}
