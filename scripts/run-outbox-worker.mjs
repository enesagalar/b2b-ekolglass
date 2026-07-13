const baseUrl = process.env.OUTBOX_BASE_URL ?? "http://localhost:3000";
const secret = process.env.OUTBOX_CRON_SECRET;

if (!secret || secret.length < 32) {
  throw new Error("OUTBOX_CRON_SECRET en az 32 karakter olmalıdır.");
}

let processed = 0;
const results = [];
for (let index = 0; index < 25; index += 1) {
  const response = await fetch(new URL("/api/internal/outbox", baseUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(45_000),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Outbox worker HTTP ${response.status}: ${result.error ?? "Bilinmeyen hata"}`);
  }
  if (result.processed === 0) break;
  processed += result.processed;
  results.push(...result.results);
}

console.log(JSON.stringify({ processed, results }));
