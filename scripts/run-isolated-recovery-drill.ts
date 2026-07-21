import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

import { inspectMigrationIntegrity } from "../src/lib/migration-integrity";
import { createSqliteBackup, verifySqliteBackup } from "../src/lib/sqlite-backup";
import { prepareMigratedTestDatabase, seedTestDatabase } from "../src/test/database-fixture";

type DrillStage = "prepare" | "seed" | "backup" | "restore" | "cleanup" | "evidence";

const failureCodes: Record<DrillStage, string> = {
  prepare: "MIGRATION_PREPARE_FAILED",
  seed: "FIXTURE_SEED_FAILED",
  backup: "BACKUP_CREATE_FAILED",
  restore: "RESTORE_VERIFY_FAILED",
  cleanup: "RECOVERY_CLEANUP_FAILED",
  evidence: "RECOVERY_EVIDENCE_WRITE_FAILED",
};

function assertSeeded(databasePath: string) {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    for (const table of ["User", "Product"] as const) {
      const row = database.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number };
      if (row.count < 1) throw new Error("Recovery fixture seed contract failed.");
    }
  } finally {
    database.close();
  }
}

async function sha256File(filePath: string) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function resolveOutputPath(argv: string[]) {
  const argument = argv.find((value) => value.startsWith("--output="));
  if (argv.some((value) => !value.startsWith("--output="))) throw new Error("Bilinmeyen recovery drill parametresi.");
  const testRoot = path.resolve(process.cwd(), ".test-data");
  const output = path.resolve(process.cwd(), argument?.slice("--output=".length) || ".test-data/recovery-drill-evidence.json");
  const relative = path.relative(testRoot, output);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || path.extname(output) !== ".json") {
    throw new Error("Recovery drill output .test-data icinde bir JSON dosyasi olmalidir.");
  }
  return { output, testRoot };
}

async function main() {
  const { output, testRoot } = resolveOutputPath(process.argv.slice(2));
  await mkdir(testRoot, { recursive: true });
  const workRoot = await mkdtemp(path.join(testRoot, "recovery-drill-"));
  const databasePath = path.join(workRoot, "source.sqlite");
  const backupRoot = path.join(workRoot, "backups");
  const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
  let stage: DrillStage = "prepare";
  const startedAt = Date.now();

  try {
    prepareMigratedTestDatabase(databasePath);
    stage = "seed";
    seedTestDatabase(`file:${databasePath.replaceAll("\\", "/")}`);
    assertSeeded(databasePath);
    const migrationIntegrity = await inspectMigrationIntegrity({ databasePath, migrationsRoot });
    if (!migrationIntegrity.ok) throw new Error("Recovery migration integrity contract failed.");
    const sourceSha256Before = await sha256File(databasePath);
    stage = "backup";
    const backup = await createSqliteBackup({
      databasePath,
      backupRoot,
      migrationsRoot,
      checkpoint: async () => undefined,
    });
    if (backup.manifest.backupRemainingPages !== 0) {
      throw new Error("Recovery backup completion contract failed.");
    }
    stage = "restore";
    const restore = await verifySqliteBackup({
      databasePath: backup.databasePath,
      manifestPath: backup.manifestPath,
      migrationsRoot,
    });
    if (JSON.stringify(restore.inspection.rowCounts) !== JSON.stringify(backup.manifest.rowCounts)) {
      throw new Error("Recovery row count contract failed.");
    }
    const sourceSha256After = await sha256File(databasePath);
    if (sourceSha256After !== sourceSha256Before) {
      throw new Error("Recovery source immutability contract failed.");
    }
    stage = "cleanup";
    await rm(workRoot, { recursive: true, force: true });
    stage = "evidence";
    const evidence = {
      schemaVersion: 1,
      status: "passed",
      runId: randomUUID(),
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      checks: {
        migrationsApplied: "passed",
        migrationChecksumsVerified: "passed",
        fixtureSeeded: "passed",
        backupCreated: "passed",
        backupCompleted: "passed",
        restoreVerified: "passed",
        sourceUnchanged: "passed",
        cleanupVerified: "passed",
      },
      source: {
        sha256: sourceSha256Before,
        appliedMigrationCount: migrationIntegrity.appliedCount,
        repositoryMigrationCount: migrationIntegrity.repositoryCount,
      },
      backup: {
        databaseFile: path.basename(backup.databasePath),
        manifestFile: path.basename(backup.manifestPath),
        byteSize: backup.manifest.byteSize,
        sha256: backup.manifest.sha256,
        migrationCount: backup.manifest.migrationCount,
        latestMigration: backup.manifest.latestMigration,
        repositoryMigrationFingerprint: backup.manifest.repositoryMigrationFingerprint,
        backupRemainingPages: backup.manifest.backupRemainingPages,
        rowCounts: backup.manifest.rowCounts,
      },
      restore: {
        integrityCheck: restore.inspection.integrityCheck,
        foreignKeyViolations: restore.inspection.foreignKeyViolations,
        migrationCount: restore.inspection.migrationCount,
        latestMigration: restore.inspection.latestMigration,
        rowCounts: restore.inspection.rowCounts,
      },
    };
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    process.stdout.write(`${JSON.stringify(evidence)}\n`);
  } catch {
    const evidence = {
      schemaVersion: 1,
      status: "failed",
      runId: randomUUID(),
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      failedStage: stage,
      errorCode: failureCodes[stage],
    };
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    process.stderr.write("Izole recovery drill basarisiz.\n");
    process.exitCode = 1;
  } finally {
    await rm(workRoot, { recursive: true, force: true });
  }
}

main().catch(() => {
  process.stderr.write("Izole recovery drill baslatilamadi.\n");
  process.exitCode = 1;
});
