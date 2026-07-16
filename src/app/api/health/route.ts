import { NextResponse } from "next/server";

import { getOutboxHealth } from "@/integrations/outbox-health";
import { getLoginSecurityHealth } from "@/features/auth/rate-limit-operations";
import { prisma } from "@/lib/prisma";
import { getMediaStorageHealth } from "@/lib/media-storage";
import { correlationHeaders, getCorrelationId, structuredLog } from "@/lib/observability";
import { getSystemJobsHealth } from "@/lib/system-jobs";

export async function GET() {
  const correlationId = getCorrelationId();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [outboxResult, authenticationResult, systemJobsResult] = await Promise.allSettled([
      getOutboxHealth(),
      getLoginSecurityHealth(),
      getSystemJobsHealth(),
    ]);
    const outbox = outboxResult.status === "fulfilled" ? outboxResult.value.status : "error";
    const authentication = authenticationResult.status === "fulfilled" ? authenticationResult.value.status : "error";
    const systemJobs = systemJobsResult.status === "fulfilled" ? systemJobsResult.value.status : "error";
    const systemJobsSeverity = systemJobsResult.status === "fulfilled" ? systemJobsResult.value.alertLevel : "critical";
    for (const [component, result] of [["outbox", outboxResult], ["authentication", authenticationResult], ["systemJobs", systemJobsResult]] as const) {
      if (result.status === "rejected") structuredLog("error", "health.component.failed", { correlationId, component, error: result.reason });
    }
    let mediaStorage: ReturnType<typeof getMediaStorageHealth> | { status: "error"; provider: "unknown" };
    try {
      mediaStorage = getMediaStorageHealth();
    } catch (error) {
      mediaStorage = { status: "error", provider: "unknown" };
      structuredLog("error", "health.component.failed", { correlationId, component: "mediaStorage", error });
    }

    return NextResponse.json({
      status:
        outbox === "degraded" || outbox === "error" || authentication === "degraded" || authentication === "error" || mediaStorage.status === "degraded" || mediaStorage.status === "error" || systemJobs === "degraded" || systemJobs === "error"
          ? "degraded"
          : "ok",
      database: "ok",
      outbox,
      authentication,
      mediaStorage: mediaStorage.status,
      mediaStorageProvider: mediaStorage.provider,
      systemJobs,
      systemJobsSeverity,
      timestamp: new Date().toISOString(),
    }, { headers: correlationHeaders(correlationId) });
  } catch (error) {
    structuredLog("error", "health.database.failed", { correlationId, error });
    return NextResponse.json(
      {
        status: "error",
        database: "error",
        message: "Health check failed.",
        correlationId,
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: correlationHeaders(correlationId) },
    );
  }
}
