import "dotenv/config";

import path from "node:path";

import Database from "better-sqlite3";

import { listLocalMediaFiles, listS3MediaObjects, reconcileMedia, type MediaAssetReference } from "../src/lib/media-reconciliation";
import { resolveMediaStorageConfig } from "../src/lib/media-storage";
import { resolveSqliteDatabasePath } from "../src/lib/sqlite-backup";

async function main() {
  const config = resolveMediaStorageConfig();

  const sampleLimitArgument = process.argv.find((argument) => argument.startsWith("--sample-limit="));
  const sampleLimit = sampleLimitArgument ? Number(sampleLimitArgument.slice("--sample-limit=".length)) : 20;
  const maxObjectsArgument = process.argv.find((argument) => argument.startsWith("--max-objects="));
  const maxObjects = maxObjectsArgument ? Number(maxObjectsArgument.slice("--max-objects=".length)) : 100_000;
  const databasePath = resolveSqliteDatabasePath(process.env.DATABASE_URL ?? "file:./dev.db");
  const storageRoot = path.join(process.cwd(), "storage", "media");
  const db = new Database(databasePath, { readonly: true, fileMustExist: true });

  try {
    const records = db.prepare(`
      SELECT objectKey, isActive
      FROM MediaAsset
      WHERE objectKey IS NOT NULL
        AND storageProvider = ?
      ORDER BY objectKey
    `).all(config.provider) as Array<{ objectKey: string; isActive: number }>;
    const storedObjects = config.provider === "LOCAL"
      ? await listLocalMediaFiles(storageRoot)
      : await listS3MediaObjects(config, maxObjects);
    const references: MediaAssetReference[] = records.map((record) => ({
      objectKey: record.objectKey,
      isActive: Boolean(record.isActive),
    }));
    console.log(JSON.stringify(reconcileMedia(references, storedObjects, config.provider, sampleLimit), null, 2));
  } finally {
    db.close();
  }
}

main().catch((error) => {
  const isSafetyError = error instanceof Error && (
    error.message.includes("safety limit") ||
    error.message.includes("continuation token") ||
    error.message.includes("sampleLimit") ||
    error.message.includes("maxObjects")
  );
  console.error(isSafetyError ? error.message : "Media reconciliation failed. Review storage access and configuration.");
  process.exitCode = 1;
});
