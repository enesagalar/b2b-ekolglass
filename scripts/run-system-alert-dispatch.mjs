const baseUrl = process.env.SYSTEM_ALERT_BASE_URL ?? "http://localhost:3000";
const secret = process.env.SYSTEM_ALERT_CRON_SECRET;

if (!secret || secret.length < 32 || secret.toLowerCase().startsWith("replace-with")) throw new Error("SYSTEM_ALERT_CRON_SECRET güçlü, placeholder olmayan ve en az 32 karakter olmalıdır.");

const startedAt = Date.now();
const response = await fetch(new URL("/api/internal/alerts", baseUrl), {
  method: "POST",
  headers: { authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(45_000),
});
const result = await response.json();
const correlationId = response.headers.get("x-request-id") ?? result.correlationId ?? null;
if (!response.ok) {
  console.error(JSON.stringify({ status: "failed", jobKey: "SYSTEM_ALERT_DISPATCH", httpStatus: response.status, correlationId, durationMs: Date.now() - startedAt }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "succeeded", jobKey: "SYSTEM_ALERT_DISPATCH", httpStatus: response.status, correlationId, durationMs: Date.now() - startedAt, queued: result.queued, processed: result.processed }));
}
