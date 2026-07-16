const baseUrl = process.env.OUTBOX_BASE_URL ?? "http://localhost:3000";
const secret = process.env.OUTBOX_CRON_SECRET;

if (!secret || secret.length < 32) throw new Error("OUTBOX_CRON_SECRET en az 32 karakter olmalıdır.");

let processed = 0;
const results = [];
const correlationIds = [];
const startedAt = Date.now();
for (let index = 0; index < 25; index += 1) {
  const response = await fetch(new URL("/api/internal/outbox", baseUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(45_000),
  });
  const result = await response.json();
  const correlationId = response.headers.get("x-request-id") ?? result.correlationId ?? null;
  if (correlationId) correlationIds.push(correlationId);
  if (!response.ok) {
    console.error(JSON.stringify({ status: "failed", jobKey: "EMAIL_OUTBOX", httpStatus: response.status, correlationId, durationMs: Date.now() - startedAt, processed }));
    process.exitCode = 1;
    break;
  }
  if (result.processed === 0) break;
  processed += result.processed;
  results.push(...result.results);
}

if (!process.exitCode) console.log(JSON.stringify({ status: "succeeded", jobKey: "EMAIL_OUTBOX", httpStatus: 200, correlationIds, durationMs: Date.now() - startedAt, processed, results }));
