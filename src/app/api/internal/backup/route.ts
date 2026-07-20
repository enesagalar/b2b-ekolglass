import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { correlationHeaders, getCorrelationId, structuredLog } from "@/lib/observability";
import { uploadVerifiedBackup } from "@/lib/offsite-backup";
import { matchesBearerSecret } from "@/lib/secret-policy";
import { createSqliteBackup, resolveSqliteDatabasePath, verifySqliteBackup } from "@/lib/sqlite-backup";
import { beginSystemJobRun, finishSystemJobRun, heartbeatSystemJobRun, SystemJobBusyError } from "@/lib/system-jobs";

export const runtime = "nodejs";

const defaultBackupRoot = path.join(process.cwd(), "backups", "database");
const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId();
  const json = (body: object, status = 200) =>
    NextResponse.json(body, { status, headers: correlationHeaders(correlationId) });
  if (!matchesBearerSecret(request.headers.get("authorization"), process.env.BACKUP_CRON_SECRET)) {
    return json({ error: "Yetkisiz backup isteği." }, 401);
  }

  let runStarted = false;
  let leaseToken: string | undefined;
  try {
    const started = await beginSystemJobRun({ runId: correlationId, jobKey: "DATABASE_BACKUP", trigger: "cron", correlationId });
    if (started.replayed) return json({ error: "Bu backup çağrısı daha önce işlendi." }, 409);
    runStarted = true;
    const activeLeaseToken = started.run.leaseToken;
    leaseToken = activeLeaseToken;
    const result = await createSqliteBackup({
      databasePath: resolveSqliteDatabasePath(process.env.DATABASE_URL),
      backupRoot: process.env.DATABASE_BACKUP_ROOT?.trim()
        ? path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_BACKUP_ROOT.trim())
        : defaultBackupRoot,
      migrationsRoot,
      checkpoint: async () => {
        await heartbeatSystemJobRun({ runId: correlationId, leaseToken: activeLeaseToken });
      },
    });
    await verifySqliteBackup({
      databasePath: result.databasePath,
      manifestPath: result.manifestPath,
      migrationsRoot,
    });
    await heartbeatSystemJobRun({ runId: correlationId, leaseToken: activeLeaseToken });
    const offsite = await uploadVerifiedBackup({
      databasePath: result.databasePath,
      manifestPath: result.manifestPath,
    });
    await heartbeatSystemJobRun({ runId: correlationId, leaseToken: activeLeaseToken });
    const backup = {
      databaseFile: path.basename(result.databasePath),
      manifestFile: path.basename(result.manifestPath),
      byteSize: result.manifest.byteSize,
      sha256: result.manifest.sha256,
      createdAt: result.manifest.createdAt,
      offsite,
    };
    await finishSystemJobRun({ runId: correlationId, leaseToken: activeLeaseToken, status: "SUCCEEDED", resultCount: 1, metadata: backup });
    structuredLog("info", "database.backup.completed", {
      correlationId,
      databaseFile: backup.databaseFile,
      byteSize: backup.byteSize,
      offsiteStatus: offsite.status,
    });
    return json({ backup, correlationId });
  } catch (error) {
    if (error instanceof SystemJobBusyError) {
      structuredLog("warn", "database.backup.busy", { correlationId });
      return json({ error: "Database backup zaten çalışıyor.", correlationId }, 409);
    }
    if (runStarted && leaseToken) {
      await finishSystemJobRun({ runId: correlationId, leaseToken, status: "FAILED", errorCode: "DATABASE_BACKUP_FAILED" }).catch(() => undefined);
    }
    structuredLog("error", "database.backup.failed", { correlationId, error });
    return json({ error: "Database backup tamamlanamadı.", correlationId }, 500);
  }
}
