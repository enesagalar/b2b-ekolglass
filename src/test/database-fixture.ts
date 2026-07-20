import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

export function prepareMigratedTestDatabase(databasePath: string) {
  const resolvedPath = path.resolve(databasePath);
  mkdirSync(path.dirname(resolvedPath), { recursive: true });
  rmSync(resolvedPath, { force: true });
  rmSync(`${resolvedPath}-journal`, { force: true });

  const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
  const migrations = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const db = new Database(resolvedPath);
  try {
    for (const migration of migrations) {
      db.exec(readFileSync(path.join(migrationsRoot, migration, "migration.sql"), "utf8"));
    }
    db.exec(`CREATE TABLE "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )`);
    const appliedAt = new Date().toISOString();
    const insert = db.prepare(`INSERT INTO "_prisma_migrations" (
      "id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count"
    ) VALUES (?, ?, ?, ?, ?, 1)`);
    for (const migration of migrations) {
      const sql = readFileSync(path.join(migrationsRoot, migration, "migration.sql"));
      insert.run(
        `test-${migration}`,
        createHash("sha256").update(sql).digest("hex"),
        appliedAt,
        migration,
        appliedAt,
      );
    }
  } finally {
    db.close();
  }
}

export function seedTestDatabase(databaseUrl: string) {
  execFileSync(
    process.execPath,
    [path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), "prisma/seed.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
        SEED_ADMIN_EMAIL: "admin@ekolglass.test",
        SEED_ADMIN_PASSWORD: "VitestOnlyPassword2026!",
      },
      stdio: "pipe",
    },
  );
}
