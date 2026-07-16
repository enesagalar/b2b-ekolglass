import "server-only";

import { createHmac } from "node:crypto";

import { PermanentOutboxError, type OutboxHandlerContext } from "@/integrations/outbox";

import { getSystemAlertConfig } from "./config";
import type { SystemAlertPayload } from "./types";

export async function sendSystemAlertWebhook(payload: SystemAlertPayload, context: OutboxHandlerContext) {
  const config = getSystemAlertConfig();
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const body = JSON.stringify({ source: "ekolglass-b2b", idempotencyKey: context.eventId, ...payload });
  const signature = createHmac("sha256", config.secret).update(`${timestamp}.${body}`).digest("hex");
  let response: Response;
  try {
    response = await fetch(config.url, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": context.eventId,
        "x-ekolglass-event": context.eventType,
        "x-ekolglass-timestamp": timestamp,
        "x-ekolglass-signature": `v1=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch {
    throw new Error("Sistem alarm webhook sağlayıcısına geçici olarak ulaşılamadı.");
  }
  if (response.ok) return { status: response.status };
  if (response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500) {
    throw new Error(`Sistem alarm webhook sağlayıcısı geçici HTTP ${response.status} döndürdü.`);
  }
  throw new PermanentOutboxError(`Sistem alarm webhook sağlayıcısı kalıcı HTTP ${response.status} döndürdü.`);
}
