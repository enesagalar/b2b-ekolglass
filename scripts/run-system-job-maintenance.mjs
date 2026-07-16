const baseUrl = process.env.MAINTENANCE_BASE_URL ?? "http://localhost:3000";
const secret = process.env.MAINTENANCE_CRON_SECRET;

if (!secret || secret.length < 32 || secret.toLowerCase().startsWith("replace-with")) {
  throw new Error("MAINTENANCE_CRON_SECRET güçlü, placeholder olmayan ve en az 32 karakter olmalıdır.");
}

const response = await fetch(new URL("/api/internal/maintenance/system-jobs", baseUrl), {
  method: "POST",
  headers: { authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(45_000),
});
const result = await response.json();

if (!response.ok) {
  throw new Error(`System job maintenance HTTP ${response.status}: ${result.error ?? "Bilinmeyen hata"}`);
}

console.log(JSON.stringify(result));
