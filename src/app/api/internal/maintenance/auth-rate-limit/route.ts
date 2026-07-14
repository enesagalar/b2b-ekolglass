import { NextResponse, type NextRequest } from "next/server";

import { cleanupExpiredLoginFailures } from "@/features/auth/rate-limit-operations";
import { matchesBearerSecret } from "@/lib/secret-policy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (
    !matchesBearerSecret(
      request.headers.get("authorization"),
      process.env.MAINTENANCE_CRON_SECRET,
    )
  ) {
    return NextResponse.json({ error: "Yetkisiz bakım isteği." }, { status: 401 });
  }

  try {
    const result = await cleanupExpiredLoginFailures("cron");
    return NextResponse.json({
      deleted: result.deleted,
      completedAt: result.completedAt.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Rate-limit bakımı tamamlanamadı." },
      { status: 500 },
    );
  }
}
