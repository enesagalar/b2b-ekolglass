import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  beginSystemJobRun: vi.fn(async () => ({ replayed: false, run: { leaseToken: "retention-lease" } })),
  finishSystemJobRun: vi.fn(async () => ({ updated: true })),
  pruneSystemJobRuns: vi.fn(async () => ({ deleted: 7, byStatus: { SUCCEEDED: 5, FAILED: 2 } })),
}));

vi.mock("@/lib/system-jobs", () => ({
  ...mocks,
  SystemJobBusyError: class extends Error {},
}));

import { POST } from "./route";

const secret = "maintenance-route-secret-at-least-32-characters";

afterEach(() => {
  delete process.env.MAINTENANCE_CRON_SECRET;
  Object.values(mocks).forEach((mock) => mock.mockClear());
});

describe("system job retention route", () => {
  it("rejects unauthorized scheduler calls", async () => {
    const response = await POST(new NextRequest("http://localhost/api/internal/maintenance/system-jobs", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.pruneSystemJobRuns).not.toHaveBeenCalled();
  });

  it("records batch retention metrics", async () => {
    process.env.MAINTENANCE_CRON_SECRET = secret;
    const response = await POST(new NextRequest("http://localhost/api/internal/maintenance/system-jobs", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ deleted: 7, byStatus: { SUCCEEDED: 5, FAILED: 2 }, correlationId: expect.any(String) });
    expect(mocks.finishSystemJobRun).toHaveBeenCalledWith(expect.objectContaining({ status: "SUCCEEDED", resultCount: 7 }));
  });
});
