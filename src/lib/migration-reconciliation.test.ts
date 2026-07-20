import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { reconcileMigrationChecksums } from "./migration-reconciliation";

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ekolglass-reconciliation-"));
  roots.push(root);
  const databasePath = path.join(root, "database.sqlite");
  const db = new Database(databasePath);
  db.exec(`
    CREATE TABLE "Product" ("id" TEXT PRIMARY KEY);
    INSERT INTO "Product" VALUES ('p1');
    CREATE TABLE "_prisma_migrations" (
      "migration_name" TEXT NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "rolled_back_at" DATETIME
    );
    INSERT INTO "_prisma_migrations" VALUES ('migration-a', '${"a".repeat(64)}', CURRENT_TIMESTAMP, NULL);
  `);
  db.close();
  return databasePath;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("migration checksum reconciliation", () => {
  it("keeps dry-run read-only and applies an exact guarded update", async () => {
    const databasePath = await fixture();
    const reconciliations = [{
      migration: "migration-a",
      previousChecksum: "a".repeat(64),
      repositoryChecksum: "b".repeat(64),
    }];
    expect(reconcileMigrationChecksums({ databasePath, reconciliations, apply: false })).toMatchObject({ status: "dry-run", reconciliationCount: 1 });
    expect(reconcileMigrationChecksums({ databasePath, reconciliations, apply: true })).toMatchObject({
      status: "applied",
      businessRowCounts: { Product: 1 },
    });
    const db = new Database(databasePath, { readonly: true });
    expect(db.prepare('SELECT checksum FROM "_prisma_migrations"').get()).toEqual({ checksum: "b".repeat(64) });
    expect(db.prepare('SELECT COUNT(*) AS count FROM "Product"').get()).toEqual({ count: 1 });
    db.close();
  });

  it("rejects an unexpected source checksum without mutation", async () => {
    const databasePath = await fixture();
    expect(() => reconcileMigrationChecksums({
      databasePath,
      reconciliations: [{ migration: "migration-a", previousChecksum: "c".repeat(64), repositoryChecksum: "b".repeat(64) }],
      apply: true,
    })).toThrow("guard failed");
    const db = new Database(databasePath, { readonly: true });
    expect(db.prepare('SELECT checksum FROM "_prisma_migrations"').get()).toEqual({ checksum: "a".repeat(64) });
    db.close();
  });
});
