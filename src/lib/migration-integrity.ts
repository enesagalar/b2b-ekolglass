import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

export type MigrationIntegrityIssueCode =
  | "MIGRATION_TABLE_MISSING"
  | "MIGRATION_INCOMPLETE"
  | "MIGRATION_ROLLED_BACK"
  | "MIGRATION_NOT_IN_REPOSITORY"
  | "MIGRATION_PENDING"
  | "MIGRATION_CHECKSUM_MISMATCH";

export type MigrationIntegrityIssue = {
  code: MigrationIntegrityIssueCode;
  migration: string | null;
};

async function repositoryChecksums(migrationsRoot: string) {
  const entries = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  return new Map(
    await Promise.all(
      entries.map(async (name) => {
        const sql = await readFile(path.join(migrationsRoot, name, "migration.sql"));
        return [name, createHash("sha256").update(sql).digest("hex")] as const;
      }),
    ),
  );
}

export async function inspectMigrationIntegrity(options: {
  databasePath: string;
  migrationsRoot: string;
}) {
  const expected = await repositoryChecksums(path.resolve(options.migrationsRoot));
  const db = new Database(path.resolve(options.databasePath), {
    readonly: true,
    fileMustExist: true,
  });

  try {
    const hasMigrationTable = Boolean(
      db
        .prepare(
          `SELECT 1 FROM sqlite_master
           WHERE type = 'table' AND name = '_prisma_migrations'`,
        )
        .get(),
    );
    if (!hasMigrationTable) {
      return {
        ok: false as const,
        appliedCount: 0,
        repositoryCount: expected.size,
        issues: [
          { code: "MIGRATION_TABLE_MISSING", migration: null },
        ] satisfies MigrationIntegrityIssue[],
      };
    }

    const rows = db
      .prepare(
        `SELECT migration_name AS migrationName, checksum, finished_at AS finishedAt,
                rolled_back_at AS rolledBackAt
         FROM "_prisma_migrations"
         ORDER BY migration_name ASC`,
      )
      .all() as Array<{
      migrationName: string;
      checksum: string;
      finishedAt: string | null;
      rolledBackAt: string | null;
    }>;
    const issues: MigrationIntegrityIssue[] = [];
    const applied = new Set<string>();
    const rowsByMigration = new Map<string, typeof rows>();
    for (const row of rows) {
      const attempts = rowsByMigration.get(row.migrationName) ?? [];
      attempts.push(row);
      rowsByMigration.set(row.migrationName, attempts);
    }

    for (const [migrationName, attempts] of rowsByMigration) {
      const row = attempts.find((attempt) => attempt.finishedAt && !attempt.rolledBackAt);
      if (!row) {
        const code = attempts.some((attempt) => !attempt.finishedAt && !attempt.rolledBackAt)
          ? "MIGRATION_INCOMPLETE"
          : "MIGRATION_ROLLED_BACK";
        issues.push({ code, migration: migrationName });
        continue;
      }
      applied.add(row.migrationName);
      const expectedChecksum = expected.get(row.migrationName);
      if (!expectedChecksum) {
        issues.push({ code: "MIGRATION_NOT_IN_REPOSITORY", migration: row.migrationName });
      } else if (expectedChecksum !== row.checksum) {
        issues.push({ code: "MIGRATION_CHECKSUM_MISMATCH", migration: row.migrationName });
      }
    }

    for (const migration of expected.keys()) {
      if (!applied.has(migration)) {
        issues.push({ code: "MIGRATION_PENDING", migration });
      }
    }

    return {
      ok: issues.length === 0,
      appliedCount: applied.size,
      repositoryCount: expected.size,
      issues,
    };
  } finally {
    db.close();
  }
}
