import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { prepareProductionDatabase } from "../../scripts/prepare-production-database";
import { prepareMigratedTestDatabase } from "../test/database-fixture";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

async function workspace() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ekolglass-release-db-"));
  workspaces.push(directory);
  return directory;
}

describe("prepareProductionDatabase", () => {
  it("allows a fresh persistent database to continue to migrations", async () => {
    const root = await workspace();
    await expect(prepareProductionDatabase({
      databasePath: path.join(root, "database", "production.db"),
      backupRoot: path.join(root, "backups"),
      migrationsRoot: path.join(process.cwd(), "prisma", "migrations"),
    })).resolves.toEqual({ status: "ready", database: "fresh", backup: null });
  });

  it("creates and verifies a pre-migration backup for an existing database", async () => {
    const root = await workspace();
    const databasePath = path.join(root, "database", "production.db");
    prepareMigratedTestDatabase(databasePath);

    const result = await prepareProductionDatabase({
      databasePath,
      backupRoot: path.join(root, "backups"),
      migrationsRoot: path.join(process.cwd(), "prisma", "migrations"),
    });

    expect(result.database).toBe("existing");
    expect(result.backup?.sha256).toMatch(/^[a-f0-9]{64}$/);
    const manifestPath = path.join(root, "backups", result.backup!.directory, result.backup!.manifest);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(manifest.latestMigration).toBe(manifest.appliedMigrations.at(-1));
    expect(manifest.foreignKeyViolations).toBe(0);
  });
});
