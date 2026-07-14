import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { runEmailOutboxOnce } from "@/integrations/email/worker";
import { matchesBearerSecret } from "@/lib/secret-policy";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  return matchesBearerSecret(
    request.headers.get("authorization"),
    process.env.OUTBOX_CRON_SECRET,
  );
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Yetkisiz worker isteği." }, { status: 401 });
  }
  if (process.env.NODE_ENV === "production" && process.env.EMAIL_PROVIDER !== "smtp") {
    return NextResponse.json({ error: "E-posta worker yapılandırılmamış." }, { status: 503 });
  }
  try {
    const results = await runEmailOutboxOnce(`email-cron:${randomUUID()}`);
    if (results.some((result) => result.status === "LEASE_LOST")) {
      return NextResponse.json({ error: "Outbox lease kaybedildi." }, { status: 409 });
    }
    return NextResponse.json({ processed: results.length, results });
  } catch {
    return NextResponse.json(
      { error: "Outbox worker çalıştırılamadı." },
      { status: 500 },
    );
  }
}
