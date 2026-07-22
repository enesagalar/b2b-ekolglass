import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("container runs as non-root with a persistent data volume", async () => {
  const dockerfile = await readFile("Dockerfile", "utf8");
  assert.match(dockerfile, /FROM node:22-bookworm-slim@sha256:[a-f0-9]{64}/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /VOLUME \["\/data"\]/);
  assert.match(dockerfile, /HEALTHCHECK[\s\S]*\/api\/health\/live/);
});

test("container fails closed before migration and traffic", async () => {
  const dockerfile = await readFile("Dockerfile", "utf8");
  const command = dockerfile.match(/CMD \["sh", "-c", "([^"]+)"\]/)?.[1] ?? "";
  const preflight = command.indexOf("scripts/production-preflight.ts");
  const migration = command.indexOf("node_modules/prisma/build/index.js migrate deploy");
  const backup = command.indexOf("scripts/prepare-production-database.ts");
  const preMigrationIntegrity = command.indexOf("scripts/verify-migration-integrity.ts --allow-pending");
  const postMigrationIntegrity = command.lastIndexOf("scripts/verify-migration-integrity.ts");
  const server = command.indexOf("next start");

  assert.ok(preflight >= 0);
  assert.ok(backup > preflight);
  assert.ok(preMigrationIntegrity > backup);
  assert.ok(migration > preMigrationIntegrity);
  assert.ok(postMigrationIntegrity > migration);
  assert.ok(server > postMigrationIntegrity);
  assert.match(command, /&&/);
});
