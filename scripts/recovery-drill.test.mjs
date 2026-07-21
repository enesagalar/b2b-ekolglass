import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("runs a secret-safe isolated backup and restore drill", { timeout: 60_000 }, async () => {
  const relativeOutput = `.test-data/recovery-drill-node-${process.pid}.json`;
  const output = path.resolve(process.cwd(), relativeOutput);
  try {
    await execFileAsync(process.execPath, [
      path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
      "scripts/run-isolated-recovery-drill.ts",
      `--output=${relativeOutput}`,
    ], { cwd: process.cwd(), windowsHide: true, timeout: 55_000 });
    const evidence = JSON.parse(await readFile(output, "utf8"));

    assert.equal(evidence.status, "passed");
    assert.equal(evidence.checks.migrationChecksumsVerified, "passed");
    assert.equal(evidence.checks.sourceUnchanged, "passed");
    assert.equal(evidence.source.appliedMigrationCount, evidence.source.repositoryMigrationCount);
    assert.match(evidence.source.sha256, /^[a-f0-9]{64}$/);
    assert.equal(evidence.backup.backupRemainingPages, 0);
    assert.equal(evidence.restore.integrityCheck, "ok");
    assert.equal(evidence.restore.foreignKeyViolations, 0);
    assert.equal(evidence.restore.migrationCount, evidence.backup.migrationCount);
    assert.deepEqual(evidence.restore.rowCounts, evidence.backup.rowCounts);
    assert.match(evidence.backup.sha256, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(evidence).includes(process.cwd()), false);
    assert.equal(JSON.stringify(evidence).includes("DATABASE_URL"), false);
  } finally {
    await rm(output, { force: true });
  }
});
