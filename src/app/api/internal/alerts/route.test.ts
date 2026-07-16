import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readiness: vi.fn(() => ({ status: "ready" })),
  reconcile: vi.fn(async () => [{ jobKey: "DATABASE_BACKUP", eventType: "OPENED" }]),
  worker: vi.fn(async () => [{ eventId: "event-1", status: "SUCCEEDED" }]),
  begin: vi.fn(async () => ({ replayed: false, run: { leaseToken: "alert-lease" } })),
  finish: vi.fn(async () => ({ updated: true })),
  health: vi.fn(async () => ({ jobs: [] })),
}));

vi.mock("@/integrations/alerts/config", () => ({ getSystemAlertReadiness: mocks.readiness }));
vi.mock("@/integrations/alerts/service", () => ({ reconcileSystemAlerts: mocks.reconcile }));
vi.mock("@/integrations/alerts/worker", () => ({ runSystemAlertOutboxOnce: mocks.worker }));
vi.mock("@/lib/system-jobs", () => ({ beginSystemJobRun: mocks.begin, finishSystemJobRun: mocks.finish, getSystemJobsHealth: mocks.health, SystemJobBusyError: class extends Error {} }));

import { POST } from "./route";

const secret = "system-alert-route-secret-at-least-32-characters";

afterEach(() => {
  delete process.env.SYSTEM_ALERT_CRON_SECRET;
  Object.values(mocks).forEach((mock) => mock.mockClear());
  mocks.readiness.mockReturnValue({ status: "ready" });
  mocks.worker.mockResolvedValue([{ eventId: "event-1", status: "SUCCEEDED" }]);
});

describe("system alert dispatch route", () => {
  it("rejects unauthorized calls before evaluating health", async () => {
    const response = await POST(new NextRequest("http://localhost/api/internal/alerts", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.health).not.toHaveBeenCalled();
  });

  it("fails closed when the provider is not ready", async () => {
    process.env.SYSTEM_ALERT_CRON_SECRET = secret;
    mocks.readiness.mockReturnValue({ status: "blocked" });
    const response = await POST(new NextRequest("http://localhost/api/internal/alerts", { method: "POST", headers: { authorization: `Bearer ${secret}` } }));
    expect(response.status).toBe(503);
    expect(mocks.begin).not.toHaveBeenCalled();
  });

  it("records queued and delivered alert counts", async () => {
    process.env.SYSTEM_ALERT_CRON_SECRET = secret;
    const response = await POST(new NextRequest("http://localhost/api/internal/alerts", { method: "POST", headers: { authorization: `Bearer ${secret}` } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ queued: 1, processed: 1, correlationId: expect.any(String) });
    expect(mocks.finish).toHaveBeenCalledWith(expect.objectContaining({ status: "SUCCEEDED", resultCount: 1 }));
  });

  it("returns non-2xx and records failure when delivery retries", async () => {
    process.env.SYSTEM_ALERT_CRON_SECRET = secret;
    mocks.worker.mockResolvedValue([{ eventId: "event-1", status: "RETRY" }]);
    const response = await POST(new NextRequest("http://localhost/api/internal/alerts", { method: "POST", headers: { authorization: `Bearer ${secret}` } }));
    expect(response.status).toBe(502);
    expect(mocks.finish).toHaveBeenCalledWith(expect.objectContaining({ status: "FAILED", errorCode: "SYSTEM_ALERT_DELIVERY_FAILED" }));
  });
});
