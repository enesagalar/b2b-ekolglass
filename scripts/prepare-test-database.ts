import path from "node:path";

import { prepareMigratedTestDatabase, seedTestDatabase } from "../src/test/database-fixture";

const relativeTarget = process.argv[2] ?? ".test-data/smoke.db";
const testRoot = path.resolve(process.cwd(), ".test-data");
const databasePath = path.resolve(process.cwd(), relativeTarget);
const relativePath = path.relative(testRoot, databasePath);
if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
  throw new Error("Test database target must be a file inside .test-data.");
}

const databaseUrl = `file:${path.relative(process.cwd(), databasePath).replaceAll("\\", "/")}`;
prepareMigratedTestDatabase(databasePath);
seedTestDatabase(databaseUrl);
console.log(JSON.stringify({ status: "ready", databaseUrl }));
