import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PermanentOutboxError, type OutboxHandlerContext } from "@/integrations/outbox";

import type { SystemAlertPayload } from "./types";
import { sendSystemAlertWebhook } from "./webhook-provider";

const payload: SystemAlertPayload = {
  schemaVersion: 1,
  eventType: "OPENED",
  jobKey: "DATABASE_BACKUP",
  jobLabel: "Veritabanı yedekleme",
  severity: "critical",
  priorSeverity: "none",
  jobStatus: "stale",
  reasonCode: "STALE",
  fingerprint: "DATABASE_BACKUP:STALE",
  observedAt: "2026-07-16T20:00:00.000Z",
  correlationId: "11111111-1111-4111-8111-111111111111",
  version: 1,
};
const context: OutboxHandlerContext = {
  eventId: "event-1",
  topic: "system.alert.notification.v1",
  eventType: "system.alert.opened.v1",
  aggregateType: "SYSTEM_JOB",
  aggregateId: "DATABASE_BACKUP",
  providerCode: null,
  attempt: 1,
};

beforeEach(() => {
  process.env.SYSTEM_ALERT_PROVIDER = "webhook";
  process.env.SYSTEM_ALERT_WEBHOOK_URL = "https://alerts.example.com/ekolglass";
  process.env.SYSTEM_ALERT_WEBHOOK_SECRET = "s".repeat(48);
  process.env.SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS = "alerts.example.com";
  process.env.SYSTEM_ALERT_TIMEOUT_MS = "10000";
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of ["SYSTEM_ALERT_PROVIDER", "SYSTEM_ALERT_WEBHOOK_URL", "SYSTEM_ALERT_WEBHOOK_SECRET", "SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS", "SYSTEM_ALERT_TIMEOUT_MS"]) delete process.env[key];
});

describe("system alert webhook provider", () => {
  it("signs the exact timestamp and request body and disables redirects", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_752_693_600_000);
    const timeoutSignal = new AbortController().signal;
    const timeoutMock = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    await expect(sendSystemAlertWebhook(payload, context)).resolves.toEqual({ status: 204 });
    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    const body = JSON.stringify({ source: "ekolglass-b2b", idempotencyKey: context.eventId, ...payload });
    const expectedSignature = createHmac("sha256", process.env.SYSTEM_ALERT_WEBHOOK_SECRET!)
      .update(`1752693600.${body}`)
      .digest("hex");

    expect(url.toString()).toBe("https://alerts.example.com/ekolglass");
    expect(init).toMatchObject({ method: "POST", redirect: "manual", body, signal: timeoutSignal });
    expect(timeoutMock).toHaveBeenCalledWith(10_000);
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-idempotency-key"]).toBe("event-1");
    expect(headers["x-ekolglass-event"]).toBe(context.eventType);
    expect(headers["x-ekolglass-timestamp"]).toBe("1752693600");
    expect(headers["x-ekolglass-signature"]).toBe(`v1=${expectedSignature}`);
    expect(JSON.stringify(init)).not.toContain(process.env.SYSTEM_ALERT_WEBHOOK_SECRET);
  });

  it("converts timeout and network failures into retryable errors", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new DOMException("The operation timed out", "TimeoutError"))
      .mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(sendSystemAlertWebhook(payload, context)).rejects.not.toBeInstanceOf(PermanentOutboxError);
    await expect(sendSystemAlertWebhook(payload, context)).rejects.not.toBeInstanceOf(PermanentOutboxError);
  });

  it.each([408, 425, 429, 500, 503])("classifies HTTP %i as retryable", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status }));

    await expect(sendSystemAlertWebhook(payload, context)).rejects.not.toBeInstanceOf(PermanentOutboxError);
  });

  it.each([302, 307, 400, 401, 403, 404])("classifies redirect or HTTP %i as permanent", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status }));

    await expect(sendSystemAlertWebhook(payload, context)).rejects.toBeInstanceOf(PermanentOutboxError);
  });
});
