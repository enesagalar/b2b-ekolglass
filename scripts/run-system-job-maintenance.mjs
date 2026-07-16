const baseUrl = process.env.MAINTENANCE_BASE_URL ?? "http://localhost:3000";
const secret = process.env.MAINTENANCE_CRON_SECRET;

if (!secret || secret.length < 32 || secret.toLowerCase().startsWith("replace-with")) {
  throw new Error("MAINTENANCE_CRON_SECRET güçlü, placeholder olmayan ve en az 32 karakter olmalıdır.");
}

const startedAt = Date.now();
const response = await fetch(new URL("/api/internal/maintenance/system-jobs", baseUrl), {
  method: "POST",
  headers: { authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(45_000),
});
const result = await response.json();
const correlationId = response.headers.get("x-request-id") ?? result.correlationId ?? null;
if (!response.ok) {
  console.error(JSON.stringify({ status: "failed", jobKey: "SYSTEM_JOB_RETENTION", httpStatus: response.status, correlationId, durationMs: Date.now() - startedAt }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "succeeded", jobKey: "SYSTEM_JOB_RETENTION", httpStatus: response.status, correlationId, durationMs: Date.now() - startedAt, deleted: result.deleted, byStatus: result.byStatus }));
}
