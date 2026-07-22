import { access } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { pathToFileURL } from "node:url";

import { createSqliteBackup, resolveSqliteDatabasePath } from "../src/lib/sqlite-backup";

loadEnvConfig(process.cwd(), false);

export async function prepareProductionDatabase(options: { databasePath: string; backupRoot: string; migrationsRoot: string }) {
  try {
    await access(options.databasePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { status: "ready" as const, database: "fresh" as const, backup: null };
    }
    throw error;
  }

  const result = await createSqliteBackup({
    databasePath: options.databasePath,
    backupRoot: options.backupRoot,
    migrationsRoot: options.migrationsRoot,
  });
  return {
    status: "ready" as const,
    database: "existing" as const,
    backup: {
      directory: path.basename(path.dirname(result.manifestPath)),
      manifest: path.basename(result.manifestPath),
      sha256: result.manifest.sha256,
    },
  };
}

async function main() {
  const result = await prepareProductionDatabase({
    databasePath: resolveSqliteDatabasePath(process.env.DATABASE_URL),
    backupRoot: path.resolve(process.env.DATABASE_BACKUP_ROOT?.trim() || ""),
    migrationsRoot: path.join(process.cwd(), "prisma", "migrations"),
  });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(JSON.stringify({ status: "failed", error: "Release-oncesi SQLite backup tamamlanamadi.", errorType: error instanceof Error ? error.name : "UnknownError" }));
    process.exitCode = 1;
  });
}
