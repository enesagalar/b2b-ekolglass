import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateRollbackManifest } from "./validate-rollback-manifest.mjs";

const example = JSON.parse(await readFile("deploy/rollback-manifest.example.json", "utf8"));

test("accepts the machine-readable rollback contract", () => {
  assert.equal(validateRollbackManifest(example).previous.releaseId, "production-previous");
});

test("rejects rollback to the current artifact", () => {
  assert.throws(
    () => validateRollbackManifest({ ...example, previous: { ...example.previous, commitSha: example.current.commitSha } }),
    /must differ/,
  );
});

test("requires verified backup evidence for both rollback paths", () => {
  assert.throws(
    () => validateRollbackManifest({ ...example, migration: { ...example.migration, backupSha256: "missing" } }),
    /backup evidence/,
  );
});
