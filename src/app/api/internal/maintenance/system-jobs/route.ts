import { NextResponse, type NextRequest } from "next/server";

import { correlationHeaders, getCorrelationId, structuredLog } from "@/lib/observability";
import { matchesBearerSecret } from "@/lib/secret-policy";
import { beginSystemJobRun, finishSystemJobRun, pruneSystemJobRuns, SystemJobBusyError } from "@/lib/system-jobs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId();
  const json = (body: object, status = 200) =>
    NextResponse.json(body, { status, headers: correlationHeaders(correlationId) });
  if (!matchesBearerSecret(request.headers.get("authorization"), process.env.MAINTENANCE_CRON_SECRET)) {
    return json({ error: "Yetkisiz bakım isteği." }, 401);
  }

  let runStarted = false;
  let leaseToken: string | undefined;
  try {
    const started = await beginSystemJobRun({ runId: correlationId, jobKey: "SYSTEM_JOB_RETENTION", trigger: "cron", correlationId });
    if (started.replayed) return json({ error: "Bu bakım çağrısı daha önce işlendi." }, 409);
    runStarted = true;
    leaseToken = started.run.leaseToken;
    const result = await pruneSystemJobRuns();
    await finishSystemJobRun({ runId: correlationId, leaseToken, status: "SUCCEEDED", resultCount: result.deleted, metadata: result.byStatus });
    structuredLog("info", "system_jobs.retention.completed", { correlationId, deleted: result.deleted, byStatus: result.byStatus });
    return json({ ...result, correlationId });
  } catch (error) {
    if (error instanceof SystemJobBusyError) {
      structuredLog("warn", "system_jobs.retention.busy", { correlationId });
      return json({ error: "İş geçmişi bakımı zaten çalışıyor.", correlationId }, 409);
    }
    if (runStarted && leaseToken) {
      await finishSystemJobRun({ runId: correlationId, leaseToken, status: "FAILED", errorCode: "SYSTEM_JOB_RETENTION_FAILED" }).catch(() => undefined);
    }
    structuredLog("error", "system_jobs.retention.failed", { correlationId, error });
    return json({ error: "İş geçmişi bakımı tamamlanamadı.", correlationId }, 500);
  }
}
