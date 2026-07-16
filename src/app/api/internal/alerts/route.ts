import { NextResponse, type NextRequest } from "next/server";

import { getSystemAlertReadiness } from "@/integrations/alerts/config";
import { reconcileSystemAlerts } from "@/integrations/alerts/service";
import { runSystemAlertOutboxOnce } from "@/integrations/alerts/worker";
import { correlationHeaders, getCorrelationId, structuredLog } from "@/lib/observability";
import { matchesBearerSecret } from "@/lib/secret-policy";
import { beginSystemJobRun, finishSystemJobRun, getSystemJobsHealth, SystemJobBusyError } from "@/lib/system-jobs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId();
  const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: correlationHeaders(correlationId) });
  if (!matchesBearerSecret(request.headers.get("authorization"), process.env.SYSTEM_ALERT_CRON_SECRET)) {
    return json({ error: "Yetkisiz sistem alarm isteği." }, 401);
  }
  if (getSystemAlertReadiness().status !== "ready") {
    return json({ error: "Sistem alarm sağlayıcısı hazır değil.", correlationId }, 503);
  }
  let runStarted = false;
  let leaseToken: string | undefined;
  try {
    const started = await beginSystemJobRun({ runId: correlationId, jobKey: "SYSTEM_ALERT_DISPATCH", trigger: "cron", correlationId });
    if (started.replayed) return json({ error: "Bu alarm çağrısı daha önce işlendi.", correlationId }, 409);
    runStarted = true;
    leaseToken = started.run.leaseToken;
    const health = await getSystemJobsHealth();
    const queued = await reconcileSystemAlerts(health);
    const results = await runSystemAlertOutboxOnce(`system-alert:${correlationId}`);
    const failed = results.filter((result) => result.status !== "SUCCEEDED");
    if (failed.length) {
      await finishSystemJobRun({ runId: correlationId, leaseToken, status: "FAILED", errorCode: "SYSTEM_ALERT_DELIVERY_FAILED", resultCount: results.length, metadata: { queued: queued.length, failed: failed.length } });
      structuredLog("error", "system.alert.dispatch_failed", { correlationId, queued: queued.length, failed: failed.length });
      return json({ error: "Sistem alarm teslimi tamamlanamadı.", queued: queued.length, processed: results.length, correlationId }, 502);
    }
    await finishSystemJobRun({ runId: correlationId, leaseToken, status: "SUCCEEDED", resultCount: results.length, metadata: { queued: queued.length } });
    structuredLog("info", "system.alert.dispatch_completed", { correlationId, queued: queued.length, processed: results.length });
    return json({ queued: queued.length, processed: results.length, results, correlationId });
  } catch (error) {
    if (error instanceof SystemJobBusyError) {
      structuredLog("warn", "system.alert.dispatch_busy", { correlationId });
      return json({ error: "Sistem alarm dağıtımı zaten çalışıyor.", correlationId }, 409);
    }
    if (runStarted && leaseToken) {
      await finishSystemJobRun({ runId: correlationId, leaseToken, status: "FAILED", errorCode: "SYSTEM_ALERT_DISPATCH_FAILED" }).catch(() => undefined);
    }
    structuredLog("error", "system.alert.dispatch_failed", { correlationId, error });
    return json({ error: "Sistem alarm dağıtımı çalıştırılamadı.", correlationId }, 500);
  }
}
