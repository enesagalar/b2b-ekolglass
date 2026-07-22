import { loadEnvConfig } from "@next/env";
import path from "node:path";

import { inspectMigrationIntegrity } from "../src/lib/migration-integrity";
import { resolveSqliteDatabasePath } from "../src/lib/sqlite-backup";

loadEnvConfig(process.cwd(), false);

async function main() {
  const allowPending = process.argv.slice(2).includes("--allow-pending");
  const result = await inspectMigrationIntegrity({
    databasePath: resolveSqliteDatabasePath(process.env.DATABASE_URL),
    migrationsRoot: path.join(process.cwd(), "prisma", "migrations"),
  });
  const blockingIssues = allowPending ? result.issues.filter((issue) => issue.code !== "MIGRATION_PENDING") : result.issues;
  if (blockingIssues.length > 0) {
    console.error(JSON.stringify({ status: "failed", ...result }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ status: "ready", ...result, ok: true, pendingCount: result.issues.length - blockingIssues.length }));
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
