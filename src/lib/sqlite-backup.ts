import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, chmod, copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

const manifestVersion = 1;
const keyTables = ["User", "Company", "Product", "Order", "OrderItem", "StockItem", "MediaAsset", "AuditLog"] as const;

export type SqliteBackupManifest = {
  version: number;
  createdAt: string;
  databaseFile: string;
  byteSize: number;
  sha256: string;
  backupTotalPages: number;
  backupRemainingPages: number;
  integrityCheck: "ok";
  foreignKeyViolations: number;
  migrationCount: number;
  latestMigration: string | null;
  appliedMigrations: string[];
  repositoryMigrationFingerprint: string | null;
  rowCounts: Record<string, number>;
};

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function sha256File(filePath: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(/* turbopackIgnore: true */ filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function getExistingTables(db: Database.Database) {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>;
  return new Set(rows.map((row) => row.name));
}

function inspectDatabase(db: Database.Database) {
  const integrityCheck = db.pragma("integrity_check", { simple: true });
  if (integrityCheck !== "ok") throw new Error(`SQLite integrity_check başarısız: ${String(integrityCheck)}`);
  const foreignKeyViolations = (db.pragma("foreign_key_check") as unknown[]).length;
  if (foreignKeyViolations > 0) throw new Error(`SQLite foreign_key_check ${foreignKeyViolations} ihlal buldu.`);
  const tables = getExistingTables(db);
  const rowCounts: Record<string, number> = {};
  for (const table of keyTables) {
    if (!tables.has(table)) continue;
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`).get() as { count: number };
    rowCounts[table] = row.count;
  }
  let migrationCount = 0;
  let latestMigration: string | null = null;
  let appliedMigrations: string[] = [];
  if (tables.has("_prisma_migrations")) {
    appliedMigrations = (db.prepare('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name ASC').all() as Array<{ migration_name: string }>).map((row) => row.migration_name);
    migrationCount = appliedMigrations.length;
    latestMigration = (db.prepare('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1').get() as { migration_name?: string } | undefined)?.migration_name ?? null;
  }
  return { integrityCheck: "ok" as const, foreignKeyViolations, migrationCount, latestMigration, appliedMigrations, rowCounts };
}

export async function readMigrationContract(migrationsRoot: string) {
  const root = await realpath(path.resolve(/* turbopackIgnore: true */ migrationsRoot));
  const entries = (await readdir(/* turbopackIgnore: true */ root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const hash = createHash("sha256");
  for (const name of entries) {
    const sql = await readFile(/* turbopackIgnore: true */ path.join(root, name, "migration.sql"));
    hash.update(name).update("\0").update(createHash("sha256").update(sql).digest("hex")).update("\n");
  }
  return { names: entries, fingerprint: hash.digest("hex") };
}

function requireMigrationMatch(applied: string[], expected: string[]) {
  if (applied.length !== expected.length || applied.some((name, index) => name !== expected[index])) {
    throw new Error("Backup uygulanmış migration listesi repository ile uyuşmuyor.");
  }
}

export function resolveSqliteDatabasePath(databaseUrl: string | undefined, cwd = process.cwd()) {
  if (!databaseUrl?.startsWith("file:")) throw new Error("DATABASE_URL file: tabanlı bir SQLite yolu olmalıdır.");
  if (databaseUrl.includes("?") || databaseUrl.includes("#") || databaseUrl.includes("\0")) throw new Error("DATABASE_URL query, fragment veya NUL içeremez.");
  const value = decodeURIComponent(databaseUrl.slice(5));
  if (!value || value === ":memory:") throw new Error("Kalıcı SQLite dosya yolu zorunludur.");
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(/* turbopackIgnore: true */ cwd, value);
}

export async function createSqliteBackup(options: { databasePath: string; backupRoot: string; migrationsRoot?: string; now?: Date; checkpoint?: () => Promise<void> }) {
  const sourcePath = await realpath(path.resolve(/* turbopackIgnore: true */ options.databasePath));
  const requestedBackupRoot = path.resolve(/* turbopackIgnore: true */ options.backupRoot);
  await access(/* turbopackIgnore: true */ sourcePath);
  await mkdir(/* turbopackIgnore: true */ requestedBackupRoot, { recursive: true });
  const backupRoot = await realpath(/* turbopackIgnore: true */ requestedBackupRoot);
  const now = options.now ?? new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const stem = `ekolglass-${timestamp}-${randomBytes(4).toString("hex")}`;
  const finalBundlePath = path.join(/* turbopackIgnore: true */ backupRoot, stem);
  const partialBundlePath = path.join(/* turbopackIgnore: true */ backupRoot, `.${stem}.partial`);
  const databaseFile = `${stem}.sqlite`;
  const manifestFile = `${stem}.manifest.json`;
  const finalDatabasePath = path.join(finalBundlePath, databaseFile);
  const partialDatabasePath = path.join(partialBundlePath, databaseFile);
  const finalManifestPath = path.join(finalBundlePath, manifestFile);
  const partialManifestPath = path.join(partialBundlePath, manifestFile);
  const relativeDestination = path.relative(backupRoot, finalBundlePath);
  if (relativeDestination.startsWith("..") || path.isAbsolute(relativeDestination)) throw new Error("Backup hedefi yapılandırılmış kök dışında olamaz.");
  await mkdir(/* turbopackIgnore: true */ partialBundlePath, { mode: 0o700 });
  const migrationContract = options.migrationsRoot ? await readMigrationContract(options.migrationsRoot) : null;
  try {
    const sourceDb = new Database(sourcePath, { readonly: true, fileMustExist: true, timeout: 30_000 });
    let backupMetadata: Database.BackupMetadata;
    try {
      backupMetadata = await sourceDb.backup(partialDatabasePath);
    } finally {
      sourceDb.close();
    }
    await chmod(/* turbopackIgnore: true */ partialDatabasePath, 0o600);
    await options.checkpoint?.();
    const backupDb = new Database(partialDatabasePath, { readonly: true, fileMustExist: true });
    let inspection;
    try {
      inspection = inspectDatabase(backupDb);
    } finally {
      backupDb.close();
    }
    if (migrationContract) requireMigrationMatch(inspection.appliedMigrations, migrationContract.names);
    const byteSize = (await stat(/* turbopackIgnore: true */ partialDatabasePath)).size;
    const manifest: SqliteBackupManifest = {
      version: manifestVersion,
      createdAt: now.toISOString(),
      databaseFile,
      byteSize,
      sha256: await sha256File(partialDatabasePath),
      backupTotalPages: backupMetadata.totalPages,
      backupRemainingPages: backupMetadata.remainingPages,
      repositoryMigrationFingerprint: migrationContract?.fingerprint ?? null,
      ...inspection,
    } as SqliteBackupManifest & { backupTotalPages: number; backupRemainingPages: number };
    await writeFile(/* turbopackIgnore: true */ partialManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    await options.checkpoint?.();
    await rename(/* turbopackIgnore: true */ partialBundlePath, finalBundlePath);
    return { databasePath: finalDatabasePath, manifestPath: finalManifestPath, manifest };
  } catch (error) {
    await Promise.all([
      rm(partialBundlePath, { recursive: true, force: true }),
      rm(finalBundlePath, { recursive: true, force: true }),
    ]);
    throw error;
  }
}

export async function verifySqliteBackup(options: { databasePath: string; manifestPath?: string; migrationsRoot?: string }) {
  const databasePath = path.resolve(/* turbopackIgnore: true */ options.databasePath);
  const manifestPath = path.resolve(/* turbopackIgnore: true */ options.manifestPath ?? databasePath.replace(/\.sqlite$/i, ".manifest.json"));
  const manifest = JSON.parse(await readFile(/* turbopackIgnore: true */ manifestPath, "utf8")) as SqliteBackupManifest;
  if (manifest.version !== manifestVersion || manifest.databaseFile !== path.basename(databasePath)) throw new Error("Backup manifest sürümü veya dosya adı geçersizdir.");
  const actualSize = (await stat(/* turbopackIgnore: true */ databasePath)).size;
  if (actualSize !== manifest.byteSize) throw new Error("Backup dosya boyutu manifest ile uyuşmuyor.");
  if (await sha256File(databasePath) !== manifest.sha256) throw new Error("Backup SHA-256 doğrulaması başarısız.");
  const migrationContract = options.migrationsRoot ? await readMigrationContract(options.migrationsRoot) : null;
  if (migrationContract && migrationContract.fingerprint !== manifest.repositoryMigrationFingerprint) throw new Error("Backup repository migration fingerprint ile uyuşmuyor.");
  const rehearsalRoot = await mkdtemp(path.join(os.tmpdir(), "ekolglass-restore-"));
  const rehearsalPath = path.join(rehearsalRoot, "restored.sqlite");
  try {
    await copyFile(/* turbopackIgnore: true */ databasePath, rehearsalPath);
    const db = new Database(rehearsalPath, { readonly: true, fileMustExist: true });
    let inspection;
    try {
      inspection = inspectDatabase(db);
    } finally {
      db.close();
    }
    if (migrationContract) requireMigrationMatch(inspection.appliedMigrations, migrationContract.names);
    if (inspection.migrationCount !== manifest.migrationCount || inspection.latestMigration !== manifest.latestMigration) throw new Error("Restore migration özeti manifest ile uyuşmuyor.");
    for (const [table, expected] of Object.entries(manifest.rowCounts)) {
      if (inspection.rowCounts[table] !== expected) throw new Error(`Restore ${table} satır sayısı manifest ile uyuşmuyor.`);
    }
    return { ok: true as const, databasePath, manifestPath, inspection };
  } finally {
    await rm(rehearsalRoot, { recursive: true, force: true });
  }
}
