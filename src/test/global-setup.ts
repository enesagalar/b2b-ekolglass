import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

import { prepareMigratedTestDatabase, seedTestDatabase } from "./database-fixture";

const testDataRoot = path.join(process.cwd(), ".test-data");
const testDatabaseUrl = "file:./.test-data/vitest.db";

function removeTestData() {
  rmSync(testDataRoot, {
    recursive: true,
    force: true,
    maxRetries: 8,
    retryDelay: 125,
  });
}

export default function setup() {
  removeTestData();
  mkdirSync(testDataRoot, { recursive: true });
  process.env.DATABASE_URL = testDatabaseUrl;

  try {
    prepareMigratedTestDatabase(path.join(testDataRoot, "vitest.db"));
    seedTestDatabase(testDatabaseUrl);
  } catch (error) {
    removeTestData();
    throw error;
  }

  return () => {
    if (process.platform !== "win32") removeTestData();
  };
}
