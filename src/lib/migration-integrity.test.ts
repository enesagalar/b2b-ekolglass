import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { inspectMigrationIntegrity } from "./migration-integrity";

const roots: string[] = [];

async function fixture(checksumOverride?: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ekolglass-migration-integrity-"));
  roots.push(root);
  const migrationsRoot = path.join(root, "migrations");
  const migration = "20260720090000_example";
  const migrationRoot = path.join(migrationsRoot, migration);
  const sql = Buffer.from('CREATE TABLE "Example" ("id" TEXT PRIMARY KEY);\n');
  await mkdir(migrationRoot, { recursive: true });
  await writeFile(path.join(migrationRoot, "migration.sql"), sql);
  const databasePath = path.join(root, "database.sqlite");
  const db = new Database(databasePath);
  db.exec(`CREATE TABLE "_prisma_migrations" (
    "migration_name" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "rolled_back_at" DATETIME
  )`);
  db.prepare(
    `INSERT INTO "_prisma_migrations"
     ("migration_name", "checksum", "finished_at", "rolled_back_at")
     VALUES (?, ?, CURRENT_TIMESTAMP, NULL)`,
  ).run(
    migration,
    checksumOverride ?? createHash("sha256").update(sql).digest("hex"),
  );
  db.close();
  return { databasePath, migrationsRoot, migration };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("migration integrity", () => {
  it("accepts a database whose applied checksums match the repository", async () => {
    const data = await fixture();
    await expect(inspectMigrationIntegrity(data)).resolves.toEqual({
      ok: true,
      appliedCount: 1,
      repositoryCount: 1,
      issues: [],
    });
  });

  it("reports a changed migration without exposing SQL or file paths", async () => {
    const data = await fixture("0".repeat(64));
    const result = await inspectMigrationIntegrity(data);
    expect(result).toMatchObject({
      ok: false,
      issues: [
        { code: "MIGRATION_CHECKSUM_MISMATCH", migration: data.migration },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(data.databasePath);
    expect(JSON.stringify(result)).not.toContain("CREATE TABLE");
  });

  it("distinguishes pending and incomplete migrations", async () => {
    const data = await fixture();
    const second = "20260720100000_pending";
    await mkdir(path.join(data.migrationsRoot, second));
    await writeFile(path.join(data.migrationsRoot, second, "migration.sql"), "SELECT 1;\n");
    const db = new Database(data.databasePath);
    db.prepare(
      `UPDATE "_prisma_migrations" SET "finished_at" = NULL
       WHERE "migration_name" = ?`,
    ).run(data.migration);
    db.close();

    const result = await inspectMigrationIntegrity(data);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        { code: "MIGRATION_INCOMPLETE", migration: data.migration },
        { code: "MIGRATION_PENDING", migration: second },
      ]),
    );
  });
});
