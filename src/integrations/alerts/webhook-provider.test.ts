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
  it("sends a signed idempotent envelope without exposing the secret", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_752_693_600_000);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    await expect(sendSystemAlertWebhook(payload, context)).resolves.toEqual({ status: 204 });
    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-idempotency-key"]).toBe("event-1");
    expect(headers["x-ekolglass-signature"]).toMatch(/^v1=[a-f0-9]{64}$/);
    expect(JSON.stringify(init)).not.toContain(process.env.SYSTEM_ALERT_WEBHOOK_SECRET);
  });

  it("classifies retryable and permanent provider responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 429 })).mockResolvedValueOnce(new Response(null, { status: 400 }));
    await expect(sendSystemAlertWebhook(payload, context)).rejects.not.toBeInstanceOf(PermanentOutboxError);
    await expect(sendSystemAlertWebhook(payload, context)).rejects.toBeInstanceOf(PermanentOutboxError);
  });
});
