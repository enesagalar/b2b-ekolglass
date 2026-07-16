import { NextResponse, type NextRequest } from "next/server";

import { cleanupExpiredLoginFailures } from "@/features/auth/rate-limit-operations";
import { correlationHeaders, getCorrelationId, structuredLog } from "@/lib/observability";
import { matchesBearerSecret } from "@/lib/secret-policy";
import { beginSystemJobRun, finishSystemJobRun, SystemJobBusyError } from "@/lib/system-jobs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId();
  const json = (body: object, status = 200) =>
    NextResponse.json(body, { status, headers: correlationHeaders(correlationId) });
  if (
    !matchesBearerSecret(
      request.headers.get("authorization"),
      process.env.MAINTENANCE_CRON_SECRET,
    )
  ) {
    return json({ error: "Yetkisiz bakım isteği." }, 401);
  }

  let runStarted = false;
  let leaseToken: string | undefined;
  try {
    const started = await beginSystemJobRun({
      runId: correlationId,
      jobKey: "AUTH_RATE_LIMIT_MAINTENANCE",
      trigger: "cron",
      correlationId,
    });
    if (started.replayed) return json({ error: "Bu bakım çağrısı daha önce işlendi." }, 409);
    runStarted = true;
    leaseToken = started.run.leaseToken;
    const result = await cleanupExpiredLoginFailures("cron");
    await finishSystemJobRun({ runId: correlationId, leaseToken, status: "SUCCEEDED", resultCount: result.deleted });
    structuredLog("info", "auth.maintenance.completed", { correlationId, deleted: result.deleted });
    return json({
      deleted: result.deleted,
      completedAt: result.completedAt.toISOString(),
      correlationId,
    });
  } catch (error) {
    if (error instanceof SystemJobBusyError) {
      structuredLog("warn", "auth.maintenance.busy", { correlationId });
      return json({ error: "Giriş güvenliği bakımı zaten çalışıyor.", correlationId }, 409);
    }
    if (runStarted && leaseToken) {
      await finishSystemJobRun({ runId: correlationId, leaseToken, status: "FAILED", errorCode: "AUTH_MAINTENANCE_FAILED" }).catch(() => undefined);
    }
    structuredLog("error", "auth.maintenance.failed", { correlationId, error });
    return json({ error: "Rate-limit bakımı tamamlanamadı.", correlationId }, 500);
  }
}
