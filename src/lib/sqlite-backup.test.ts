import { appendFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { createSqliteBackup, resolveSqliteDatabasePath, verifySqliteBackup } from "./sqlite-backup";

const tempRoots: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ekolglass-backup-test-"));
  tempRoots.push(root);
  const databasePath = path.join(root, "source.sqlite");
  const db = new Database(databasePath);
  db.exec(`
    CREATE TABLE "Product" (id TEXT PRIMARY KEY, code TEXT NOT NULL);
    CREATE TABLE "Order" (id TEXT PRIMARY KEY);
    CREATE TABLE "_prisma_migrations" (migration_name TEXT, finished_at DATETIME, rolled_back_at DATETIME);
    INSERT INTO "Product" VALUES ('p1', 'E000001');
    INSERT INTO "Order" VALUES ('o1');
    INSERT INTO "_prisma_migrations" VALUES ('20260714180000_test', CURRENT_TIMESTAMP, NULL);
  `);
  db.close();
  return { root, databasePath, backupRoot: path.join(root, "backups") };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("SQLite backup operations", () => {
  it("resolves only durable file SQLite URLs", () => {
    expect(resolveSqliteDatabasePath("file:./dev.db", "C:\\portal")).toBe(path.resolve("C:\\portal", "./dev.db"));
    expect(() => resolveSqliteDatabasePath("postgresql://example")).toThrow("SQLite");
    expect(() => resolveSqliteDatabasePath("file::memory:")).toThrow("Kalıcı");
    expect(() => resolveSqliteDatabasePath("file:./dev.db?mode=ro")).toThrow("query");
  });

  it("creates an online backup manifest and verifies a restore rehearsal", async () => {
    const data = await fixture();
    const result = await createSqliteBackup({ databasePath: data.databasePath, backupRoot: data.backupRoot, now: new Date("2026-07-14T17:00:00.000Z") });
    expect(result.manifest).toMatchObject({ integrityCheck: "ok", foreignKeyViolations: 0, migrationCount: 1, latestMigration: "20260714180000_test", rowCounts: { Product: 1, Order: 1 } });
    const verification = await verifySqliteBackup({ databasePath: result.databasePath, manifestPath: result.manifestPath });
    expect(verification.ok).toBe(true);
  });

  it("rejects a backup changed after manifest creation", async () => {
    const data = await fixture();
    const result = await createSqliteBackup({ databasePath: data.databasePath, backupRoot: data.backupRoot });
    await appendFile(result.databasePath, Buffer.from([0x00]));
    await expect(verifySqliteBackup({ databasePath: result.databasePath, manifestPath: result.manifestPath })).rejects.toThrow("boyutu");
    expect(JSON.parse(await readFile(result.manifestPath, "utf8"))).toHaveProperty("sha256");
  });

  it("does not publish a bundle when the lease checkpoint fails", async () => {
    const data = await fixture();
    await expect(createSqliteBackup({
      databasePath: data.databasePath,
      backupRoot: data.backupRoot,
      checkpoint: async () => {
        throw new Error("lease expired");
      },
    })).rejects.toThrow("lease expired");

    expect(await readdir(data.backupRoot)).toEqual([]);
  });
});
