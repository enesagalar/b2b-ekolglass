import "dotenv/config";

import path from "node:path";

import Database from "better-sqlite3";

import { listLocalMediaFiles, reconcileLocalMedia, requireLocalMediaProvider, type MediaAssetReference } from "../src/lib/media-reconciliation";
import { resolveMediaStorageConfig } from "../src/lib/media-storage";
import { resolveSqliteDatabasePath } from "../src/lib/sqlite-backup";

async function main() {
  const config = resolveMediaStorageConfig();
  requireLocalMediaProvider(config.provider);

  const sampleLimitArgument = process.argv.find((argument) => argument.startsWith("--sample-limit="));
  const sampleLimit = sampleLimitArgument ? Number(sampleLimitArgument.slice("--sample-limit=".length)) : 20;
  const databasePath = resolveSqliteDatabasePath(process.env.DATABASE_URL ?? "file:./dev.db");
  const storageRoot = path.join(process.cwd(), "storage", "media");
  const db = new Database(databasePath, { readonly: true, fileMustExist: true });

  try {
    const records = db.prepare(`
      SELECT objectKey, isActive
      FROM MediaAsset
      WHERE objectKey IS NOT NULL
      ORDER BY objectKey
    `).all() as Array<{ objectKey: string; isActive: number }>;
    const localFiles = await listLocalMediaFiles(storageRoot);
    const references: MediaAssetReference[] = records.map((record) => ({
      objectKey: record.objectKey,
      isActive: Boolean(record.isActive),
    }));
    console.log(JSON.stringify(reconcileLocalMedia(references, localFiles, sampleLimit), null, 2));
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
