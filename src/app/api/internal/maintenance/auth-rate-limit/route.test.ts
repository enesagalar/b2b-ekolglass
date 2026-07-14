import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cleanupExpiredLoginFailures: vi.fn(),
}));

vi.mock("@/features/auth/rate-limit-operations", () => ({
  cleanupExpiredLoginFailures: mocks.cleanupExpiredLoginFailures,
}));

import { POST } from "./route";

const secret = "maintenance-route-secret-at-least-32-characters";

afterEach(() => {
  delete process.env.MAINTENANCE_CRON_SECRET;
  mocks.cleanupExpiredLoginFailures.mockReset();
});

describe("auth rate-limit maintenance route", () => {
  it("rejects missing, weak and placeholder bearer secrets", async () => {
    process.env.MAINTENANCE_CRON_SECRET = "short";
    const weak = await POST(new NextRequest("http://localhost/api/internal/maintenance/auth-rate-limit", {
      method: "POST",
      headers: { authorization: "Bearer short" },
    }));

    process.env.MAINTENANCE_CRON_SECRET = "replace-with-a-separate-long-random-secret";
    const placeholder = await POST(new NextRequest("http://localhost/api/internal/maintenance/auth-rate-limit", {
      method: "POST",
      headers: { authorization: "Bearer replace-with-a-separate-long-random-secret" },
    }));

    expect(weak.status).toBe(401);
    expect(placeholder.status).toBe(401);
    expect(mocks.cleanupExpiredLoginFailures).not.toHaveBeenCalled();
  });

  it("runs idempotent cleanup for an authorized scheduler", async () => {
    process.env.MAINTENANCE_CRON_SECRET = secret;
    mocks.cleanupExpiredLoginFailures.mockResolvedValue({
      deleted: 12,
      completedAt: new Date("2026-07-14T12:00:00.000Z"),
    });

    const response = await POST(new NextRequest("http://localhost/api/internal/maintenance/auth-rate-limit", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      deleted: 12,
      completedAt: "2026-07-14T12:00:00.000Z",
    });
    expect(mocks.cleanupExpiredLoginFailures).toHaveBeenCalledWith("cron");
  });

  it("returns a controlled error when maintenance fails", async () => {
    process.env.MAINTENANCE_CRON_SECRET = secret;
    mocks.cleanupExpiredLoginFailures.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(new NextRequest("http://localhost/api/internal/maintenance/auth-rate-limit", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Rate-limit bakımı tamamlanamadı.",
    });
  });
});
