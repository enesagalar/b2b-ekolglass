import { loadEnvConfig } from "@next/env";
import path from "node:path";

import { inspectMigrationIntegrity } from "../src/lib/migration-integrity";
import { resolveSqliteDatabasePath } from "../src/lib/sqlite-backup";

loadEnvConfig(process.cwd(), false);

async function main() {
  const result = await inspectMigrationIntegrity({
    databasePath: resolveSqliteDatabasePath(process.env.DATABASE_URL),
    migrationsRoot: path.join(process.cwd(), "prisma", "migrations"),
  });
  if (!result.ok) {
    console.error(JSON.stringify({ status: "failed", ...result }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ status: "ready", ...result }));
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      status: "failed",
      error: "Migration bütünlüğü doğrulanamadı.",
      errorType: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  process.exitCode = 1;
});
