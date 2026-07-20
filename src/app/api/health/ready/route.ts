import { prisma } from "@/lib/prisma";
import { checkMediaStorageReadiness } from "@/lib/media-storage";
import { correlationHeaders, getCorrelationId, structuredLog } from "@/lib/observability";
import { validateProductionEnvironment } from "@/lib/production-environment";

export const dynamic = "force-dynamic";

export async function GET() {
  const correlationId = getCorrelationId();
  const environment = validateProductionEnvironment();
  if (!environment.ok) {
    return Response.json(
      {
        status: "not_ready",
        checks: { environment: "error", database: "skipped", mediaStorage: "skipped" },
        issueKeys: environment.issues.map((issue) => issue.key),
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: correlationHeaders(correlationId) },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    structuredLog("error", "health.readiness.database_failed", { correlationId, error });
    return Response.json(
      {
        status: "not_ready",
        checks: { environment: "ok", database: "error", mediaStorage: "skipped" },
        correlationId,
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: correlationHeaders(correlationId) },
    );
  }

  const mediaStorage = await checkMediaStorageReadiness();
  if (mediaStorage.status !== "ok") {
    structuredLog("error", "health.readiness.media_storage_failed", {
      correlationId,
      provider: mediaStorage.provider,
      reason: mediaStorage.reason,
    });
    return Response.json(
      {
        status: "not_ready",
        checks: { environment: "ok", database: "ok", mediaStorage: "error" },
        correlationId,
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: correlationHeaders(correlationId) },
    );
  }

  return Response.json({
    status: "ready",
    checks: { environment: "ok", database: "ok", mediaStorage: "ok" },
    timestamp: new Date().toISOString(),
  }, { headers: correlationHeaders(correlationId) });
}
