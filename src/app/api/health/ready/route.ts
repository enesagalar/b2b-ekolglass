import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { validateProductionEnvironment } from "@/lib/production-environment";

export const dynamic = "force-dynamic";

export async function GET() {
  const environment = validateProductionEnvironment();
  if (!environment.ok) {
    return Response.json(
      {
        status: "not_ready",
        checks: { environment: "error", database: "skipped" },
        issueKeys: environment.issues.map((issue) => issue.key),
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ready",
      checks: { environment: "ok", database: "ok" },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const correlationId = randomUUID();
    console.error("Readiness database check failed", { correlationId, error });
    return Response.json(
      {
        status: "not_ready",
        checks: { environment: "ok", database: "error" },
        correlationId,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
