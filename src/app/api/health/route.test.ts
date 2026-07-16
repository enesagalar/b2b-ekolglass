import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(async () => [{ ok: 1 }]),
  getOutboxHealth: vi.fn(async () => ({ status: "ok" })),
  getLoginSecurityHealth: vi.fn(async () => ({ status: "ok" })),
  getSystemJobsHealth: vi.fn(),
  structuredLog: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: mocks.queryRaw } }));
vi.mock("@/integrations/outbox-health", () => ({ getOutboxHealth: mocks.getOutboxHealth }));
vi.mock("@/features/auth/rate-limit-operations", () => ({ getLoginSecurityHealth: mocks.getLoginSecurityHealth }));
vi.mock("@/lib/system-jobs", () => ({ getSystemJobsHealth: mocks.getSystemJobsHealth }));
vi.mock("@/lib/media-storage", () => ({ getMediaStorageHealth: () => ({ status: "ok", provider: "LOCAL" }) }));
vi.mock("@/lib/observability", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/observability")>()),
  structuredLog: mocks.structuredLog,
}));

import { GET } from "./route";

describe("operational health route", () => {
  it("keeps database healthy when only scheduler health fails", async () => {
    mocks.getSystemJobsHealth.mockRejectedValueOnce(new Error("scheduler query failed"));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "degraded",
      database: "ok",
      systemJobs: "error",
      systemJobsSeverity: "critical",
    });
    expect(mocks.structuredLog).toHaveBeenCalledWith("error", "health.component.failed", expect.objectContaining({ component: "systemJobs" }));
  });
});
