import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkMediaStorageReadiness: vi.fn(),
  queryRaw: vi.fn(),
  structuredLog: vi.fn(),
  validateProductionEnvironment: vi.fn(),
}));

vi.mock("@/lib/media-storage", () => ({ checkMediaStorageReadiness: mocks.checkMediaStorageReadiness }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: mocks.queryRaw } }));
vi.mock("@/lib/production-environment", () => ({ validateProductionEnvironment: mocks.validateProductionEnvironment }));
vi.mock("@/lib/observability", () => ({
  correlationHeaders: (correlationId: string) => ({ "x-request-id": correlationId }),
  getCorrelationId: () => "readiness-test-id",
  structuredLog: mocks.structuredLog,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.validateProductionEnvironment.mockReturnValue({ ok: true, issues: [] });
  mocks.queryRaw.mockResolvedValue([{ 1: 1 }]);
  mocks.checkMediaStorageReadiness.mockResolvedValue({ status: "ok", provider: "LOCAL" });
});

describe("GET /api/health/ready", () => {
  it("returns 503 and setting names when production configuration is invalid", async () => {
    mocks.validateProductionEnvironment.mockReturnValue({
      ok: false,
      issues: [{ key: "NEXT_PUBLIC_SITE_URL", message: "invalid" }],
    });
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "not_ready",
      checks: { environment: "error", database: "skipped", mediaStorage: "skipped" },
    });
    expect(body.issueKeys).toContain("NEXT_PUBLIC_SITE_URL");
    expect(mocks.queryRaw).not.toHaveBeenCalled();
    expect(mocks.checkMediaStorageReadiness).not.toHaveBeenCalled();
  });

  it("returns 503 without probing media when the database is unavailable", async () => {
    mocks.queryRaw.mockRejectedValue(new Error("database unavailable"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "not_ready",
      checks: { environment: "ok", database: "error", mediaStorage: "skipped" },
    });
    expect(mocks.checkMediaStorageReadiness).not.toHaveBeenCalled();
  });

  it("returns 503 with a redacted contract when media storage is inaccessible", async () => {
    mocks.checkMediaStorageReadiness.mockResolvedValue({ status: "degraded", provider: "S3", reason: "unreachable" });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "not_ready",
      checks: { environment: "ok", database: "ok", mediaStorage: "error" },
      correlationId: "readiness-test-id",
    });
    expect(JSON.stringify(body)).not.toContain("bucket");
  });

  it("becomes ready only after environment, database, and media pass", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ready",
      checks: { environment: "ok", database: "ok", mediaStorage: "ok" },
    });
  });
});
