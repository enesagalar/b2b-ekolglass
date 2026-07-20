import { createHash } from "node:crypto";

import Database from "better-sqlite3";

export type MigrationChecksumReconciliation = {
  migration: string;
  previousChecksum: string;
  repositoryChecksum: string;
};

function schemaFingerprint(db: Database.Database) {
  const rows = db
    .prepare(
      `SELECT type, name, tbl_name AS tableName, sql
       FROM sqlite_master
       WHERE name NOT LIKE 'sqlite_%'
       ORDER BY type, name`,
    )
    .all() as Array<{ type: string; name: string; tableName: string; sql: string | null }>;
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function businessRowCounts(db: Database.Database) {
  const tables = ["User", "Company", "Product", "Order", "OrderItem", "StockItem", "AuditLog"];
  const existing = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map(
      (row) => row.name,
    ),
  );
  return Object.fromEntries(
    tables
      .filter((table) => existing.has(table))
      .map((table) => [
        table,
        (db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number }).count,
      ]),
  );
}

export function reconcileMigrationChecksums(options: {
  databasePath: string;
  reconciliations: MigrationChecksumReconciliation[];
  apply: boolean;
}) {
  const db = new Database(options.databasePath, { fileMustExist: true, timeout: 30_000 });
  try {
    const beforeFingerprint = schemaFingerprint(db);
    const beforeCounts = businessRowCounts(db);
    const currentRows = new Map(
      (
        db
          .prepare(
            `SELECT migration_name AS migration, checksum
             FROM "_prisma_migrations"
             WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
          )
          .all() as Array<{ migration: string; checksum: string }>
      ).map((row) => [row.migration, row.checksum]),
    );

    for (const item of options.reconciliations) {
      if (currentRows.get(item.migration) !== item.previousChecksum) {
        throw new Error(`Migration reconciliation guard failed: ${item.migration}`);
      }
      if (!/^[a-f0-9]{64}$/.test(item.repositoryChecksum)) {
        throw new Error(`Repository checksum is invalid: ${item.migration}`);
      }
    }

    if (!options.apply) {
      return {
        status: "dry-run" as const,
        reconciliationCount: options.reconciliations.length,
        schemaFingerprint: beforeFingerprint,
        businessRowCounts: beforeCounts,
      };
    }

    const update = db.prepare(
      `UPDATE "_prisma_migrations"
       SET checksum = ?
       WHERE migration_name = ? AND checksum = ?
         AND finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    );
    db.transaction(() => {
      for (const item of options.reconciliations) {
        const result = update.run(item.repositoryChecksum, item.migration, item.previousChecksum);
        if (result.changes !== 1) throw new Error(`Migration reconciliation update failed: ${item.migration}`);
      }
      if (schemaFingerprint(db) !== beforeFingerprint) throw new Error("Schema fingerprint changed during reconciliation.");
      if (JSON.stringify(businessRowCounts(db)) !== JSON.stringify(beforeCounts)) {
        throw new Error("Business row counts changed during reconciliation.");
      }
    })();

    return {
      status: "applied" as const,
      reconciliationCount: options.reconciliations.length,
      schemaFingerprint: beforeFingerprint,
      businessRowCounts: beforeCounts,
    };
  } finally {
    db.close();
  }
}
