import path from "node:path";

import { createSqliteBackup, resolveSqliteDatabasePath } from "../src/lib/sqlite-backup";

async function main() {
  const databasePath = resolveSqliteDatabasePath(process.env.DATABASE_URL);
  const backupRoot = path.resolve(process.env.DATABASE_BACKUP_ROOT?.trim() || path.join(process.cwd(), "backups", "database"));
  const result = await createSqliteBackup({ databasePath, backupRoot, migrationsRoot: path.join(process.cwd(), "prisma", "migrations") });
  console.log(JSON.stringify({ ok: true, databasePath: result.databasePath, manifestPath: result.manifestPath, manifest: result.manifest }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
