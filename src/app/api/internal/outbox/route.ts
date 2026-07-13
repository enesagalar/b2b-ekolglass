import { randomUUID, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { runEmailOutboxOnce } from "@/integrations/email/worker";
import { isStrongRuntimeSecret } from "@/lib/secret-policy";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.OUTBOX_CRON_SECRET;
  if (!isStrongRuntimeSecret(secret)) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
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
