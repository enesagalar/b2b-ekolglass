import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe("GET /api/health/ready", () => {
  it("returns 503 and setting names when production configuration is invalid", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "not_ready",
      checks: { environment: "error", database: "skipped" },
    });
    expect(body.issueKeys).toContain("NEXT_PUBLIC_SITE_URL");
  });
});
