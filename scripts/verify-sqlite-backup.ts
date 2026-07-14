import { verifySqliteBackup } from "../src/lib/sqlite-backup";
import path from "node:path";

async function main() {
  const databasePath = process.argv[2];
  if (!databasePath) throw new Error("Kullanım: npm run db:restore:verify -- <backup.sqlite>");
  const result = await verifySqliteBackup({ databasePath, migrationsRoot: path.join(process.cwd(), "prisma", "migrations") });
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
