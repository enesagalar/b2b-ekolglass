import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getOutboxHealth } from "@/integrations/outbox-health";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const outbox = await getOutboxHealth();

    return NextResponse.json({
      status: outbox.status === "degraded" ? "degraded" : "ok",
      database: "ok",
      outbox: outbox.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const correlationId = randomUUID();
    console.error("Health check failed", { correlationId, error });
    return NextResponse.json(
      {
        status: "error",
        database: "error",
        message: "Health check failed.",
        correlationId,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
