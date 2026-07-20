import { loadEnvConfig } from "@next/env";
import path from "node:path";

import { inspectMigrationIntegrity } from "../src/lib/migration-integrity";
import { reconcileMigrationChecksums } from "../src/lib/migration-reconciliation";
import { createSqliteBackup, resolveSqliteDatabasePath, verifySqliteBackup } from "../src/lib/sqlite-backup";

loadEnvConfig(process.cwd(), false);

const reconciliations = [
  {
    migration: "20260713133500_harden_order_checkout",
    previousChecksum: "c94862c4fc4f958b82c5dbb1c3a00b6cf3a0a8ea1cab24328d4366e4cf8fe304",
    repositoryChecksum: "d5f3c5224af0517c587f086c9d7eae22378c4a15182ef3dc34b2bc765b9c8be1",
  },
  {
    migration: "20260713171000_add_quote_order_conversion",
    previousChecksum: "f904dabab6f6262acd7c157452e6fc8c6adaf4fc85f6919b8ca9f1d77072c138",
    repositoryChecksum: "b2375c9145e605108bcb22c82407cf93a087092d3773d91597bf8e438a11c477",
  },
] as const;

async function main() {
  const apply = process.argv.includes("--apply");
  const databasePath = resolveSqliteDatabasePath(process.env.DATABASE_URL);
  const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
  const before = await inspectMigrationIntegrity({ databasePath, migrationsRoot });
  if (before.ok) {
    console.log(JSON.stringify({ status: "already-reconciled", integrityReady: true }, null, 2));
    return;
  }
  const expectedIssues = reconciliations.map((item) => ({
    code: "MIGRATION_CHECKSUM_MISMATCH",
    migration: item.migration,
  }));
  if (JSON.stringify(before.issues) !== JSON.stringify(expectedIssues)) {
    throw new Error("Migration integrity state does not match the approved reconciliation set.");
  }

  let backup: { databasePath: string; manifestPath: string } | null = null;
  if (apply) {
    const created = await createSqliteBackup({
      databasePath,
      backupRoot: path.resolve(process.env.DATABASE_BACKUP_ROOT?.trim() || path.join(process.cwd(), "backups", "database")),
      migrationsRoot,
    });
    await verifySqliteBackup({ databasePath: created.databasePath, manifestPath: created.manifestPath, migrationsRoot });
    backup = { databasePath: created.databasePath, manifestPath: created.manifestPath };
  }

  const result = reconcileMigrationChecksums({ databasePath, reconciliations: [...reconciliations], apply });
  const after = await inspectMigrationIntegrity({ databasePath, migrationsRoot });
  if (apply && !after.ok) {
    reconcileMigrationChecksums({
      databasePath,
      reconciliations: reconciliations.map((item) => ({
        migration: item.migration,
        previousChecksum: item.repositoryChecksum,
        repositoryChecksum: item.previousChecksum,
      })),
      apply: true,
    });
    throw new Error("Post-reconciliation integrity failed; metadata changes were reverted.");
  }

  console.log(JSON.stringify({
    status: result.status,
    reconciliationCount: result.reconciliationCount,
    schemaFingerprint: result.schemaFingerprint,
    businessRowCounts: result.businessRowCounts,
    integrityReady: after.ok,
    backupCreated: Boolean(backup),
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "failed",
    error: error instanceof Error ? error.message : "Migration reconciliation failed.",
  }));
  process.exitCode = 1;
});
