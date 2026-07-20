import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { resolveTestDatabasePath } from "./sqlite-database-path.mjs";

test("resolves relative and absolute file-backed SQLite URLs", () => {
  const root = path.join(os.tmpdir(), "ekolglass-smoke-path");
  expectPath(resolveTestDatabasePath("file:./smoke.db", root), path.join(root, "smoke.db"));
  const absolute = path.join(root, "absolute.db");
  expectPath(resolveTestDatabasePath(pathToFileURL(absolute).href, root), absolute);
});

test("rejects unsafe or non-file database URLs", () => {
  for (const value of [
    "postgresql://localhost/portal",
    "file::memory:",
    "file:./smoke.db?mode=ro",
    "file:./smoke.db#fragment",
    "file:./bad%ZZ.db",
    "file:./bad%00.db",
  ]) {
    assert.throws(() => resolveTestDatabasePath(value));
  }
});

function expectPath(actual, expected) {
  assert.equal(path.normalize(actual), path.normalize(expected));
}
