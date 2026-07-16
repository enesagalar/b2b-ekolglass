import { NextResponse, type NextRequest } from "next/server";

import { runEmailOutboxOnce } from "@/integrations/email/worker";
import { correlationHeaders, getCorrelationId, structuredLog } from "@/lib/observability";
import { matchesBearerSecret } from "@/lib/secret-policy";
import { beginSystemJobRun, finishSystemJobRun, SystemJobBusyError } from "@/lib/system-jobs";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  return matchesBearerSecret(
    request.headers.get("authorization"),
    process.env.OUTBOX_CRON_SECRET,
  );
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId();
  const json = (body: object, status = 200) =>
    NextResponse.json(body, { status, headers: correlationHeaders(correlationId) });
  if (!authorized(request)) {
    return json({ error: "Yetkisiz worker isteği." }, 401);
  }
  if (process.env.NODE_ENV === "production" && process.env.EMAIL_PROVIDER !== "smtp") {
    return json({ error: "E-posta worker yapılandırılmamış." }, 503);
  }
  let runStarted = false;
  let leaseToken: string | undefined;
  try {
    const started = await beginSystemJobRun({
      runId: correlationId,
      jobKey: "EMAIL_OUTBOX",
      trigger: "cron",
      correlationId,
    });
    if (started.replayed) return json({ error: "Bu worker çağrısı daha önce işlendi." }, 409);
    runStarted = true;
    leaseToken = started.run.leaseToken;
    const results = await runEmailOutboxOnce(`email-cron:${correlationId}`);
    if (results.some((result) => result.status === "LEASE_LOST")) {
      await finishSystemJobRun({ runId: correlationId, leaseToken, status: "FAILED", errorCode: "LEASE_LOST", resultCount: results.length });
      structuredLog("warn", "outbox.worker.lease_lost", { correlationId, resultCount: results.length });
      return json({ error: "Outbox lease kaybedildi.", correlationId }, 409);
    }
    await finishSystemJobRun({ runId: correlationId, leaseToken, status: "SUCCEEDED", resultCount: results.length });
    structuredLog("info", "outbox.worker.completed", { correlationId, resultCount: results.length });
    return json({ processed: results.length, results, correlationId });
  } catch (error) {
    if (error instanceof SystemJobBusyError) {
      structuredLog("warn", "outbox.worker.busy", { correlationId });
      return json({ error: "Outbox worker zaten çalışıyor.", correlationId }, 409);
    }
    if (runStarted && leaseToken) {
      await finishSystemJobRun({ runId: correlationId, leaseToken, status: "FAILED", errorCode: "OUTBOX_RUN_FAILED" }).catch(() => undefined);
    }
    structuredLog("error", "outbox.worker.failed", { correlationId, error });
    return json({ error: "Outbox worker çalıştırılamadı.", correlationId }, 500);
  }
}
