import path from "node:path";

import { createSqliteBackup, resolveSqliteDatabasePath } from "../src/lib/sqlite-backup";

async function main() {
  const databasePath = resolveSqliteDatabasePath(process.env.DATABASE_URL);
  const backupRoot = path.resolve(process.env.DATABASE_BACKUP_ROOT?.trim() || path.join(process.cwd(), "backups", "database"));
  const result = await createSqliteBackup({ databasePath, backupRoot, migrationsRoot: path.join(process.cwd(), "prisma", "migrations") });
  console.log(JSON.stringify({ ok: true, databaseFile: path.basename(result.databasePath), manifestFile: path.basename(result.manifestPath), manifest: result.manifest }));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: "Database backup tamamlanamadı.", errorType: error instanceof Error ? error.name : "UnknownError" }));
  process.exitCode = 1;
});
