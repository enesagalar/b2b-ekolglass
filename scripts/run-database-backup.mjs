const baseUrl = process.env.BACKUP_BASE_URL ?? "http://localhost:3000";
const secret = process.env.BACKUP_CRON_SECRET;

if (!secret || secret.length < 32 || secret.toLowerCase().startsWith("replace-with")) {
  throw new Error("BACKUP_CRON_SECRET güçlü, placeholder olmayan ve en az 32 karakter olmalıdır.");
}

const response = await fetch(new URL("/api/internal/backup", baseUrl), {
  method: "POST",
  headers: { authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(120_000),
});
const result = await response.json();

if (!response.ok) {
  throw new Error(`Database backup HTTP ${response.status}: ${result.error ?? "Bilinmeyen hata"}`);
}

console.log(JSON.stringify(result));
