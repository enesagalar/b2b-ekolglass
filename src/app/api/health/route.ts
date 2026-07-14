import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getOutboxHealth } from "@/integrations/outbox-health";
import { getLoginSecurityHealth } from "@/features/auth/rate-limit-operations";
import { prisma } from "@/lib/prisma";
import { getMediaStorageHealth } from "@/lib/media-storage";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [outbox, authentication] = await Promise.all([
      getOutboxHealth(),
      getLoginSecurityHealth(),
    ]);
    const mediaStorage = getMediaStorageHealth();

    return NextResponse.json({
      status:
        outbox.status === "degraded" || authentication.status === "degraded" || mediaStorage.status === "degraded"
          ? "degraded"
          : "ok",
      database: "ok",
      outbox: outbox.status,
      authentication: authentication.status,
      mediaStorage: mediaStorage.status,
      mediaStorageProvider: mediaStorage.provider,
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
