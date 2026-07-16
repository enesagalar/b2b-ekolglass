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
    const [outbox, authentication, systemJobs] = await Promise.all([
      getOutboxHealth(),
      getLoginSecurityHealth(),
      getSystemJobsHealth(),
    ]);
    const mediaStorage = getMediaStorageHealth();

    return NextResponse.json({
      status:
        outbox.status === "degraded" || authentication.status === "degraded" || mediaStorage.status === "degraded" || systemJobs.status === "degraded"
          ? "degraded"
          : "ok",
      database: "ok",
      outbox: outbox.status,
      authentication: authentication.status,
      mediaStorage: mediaStorage.status,
      mediaStorageProvider: mediaStorage.provider,
      systemJobs: systemJobs.status,
      timestamp: new Date().toISOString(),
    }, { headers: correlationHeaders(correlationId) });
  } catch (error) {
    structuredLog("error", "health.operational.failed", { correlationId, error });
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
