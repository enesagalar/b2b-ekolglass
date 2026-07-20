import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

import { prepareMigratedTestDatabase, seedTestDatabase } from "./database-fixture";

const testDataRoot = path.join(process.cwd(), ".test-data");
const testDatabaseUrl = "file:./.test-data/vitest.db";

export default function setup() {
  rmSync(testDataRoot, { recursive: true, force: true });
  mkdirSync(testDataRoot, { recursive: true });
  process.env.DATABASE_URL = testDatabaseUrl;

  try {
    prepareMigratedTestDatabase(path.join(testDataRoot, "vitest.db"));
    seedTestDatabase(testDatabaseUrl);
  } catch (error) {
    rmSync(testDataRoot, { recursive: true, force: true });
    throw error;
  }

  return () => {
    rmSync(testDataRoot, { recursive: true, force: true });
  };
}
