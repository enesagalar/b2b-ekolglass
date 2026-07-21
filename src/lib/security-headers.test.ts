import { describe, expect, it } from "vitest";

import { getSecurityHeaders } from "./security-headers";

function asRecord(environment: "development" | "production" | "test") {
  return Object.fromEntries(getSecurityHeaders(environment).map(({ key, value }) => [key, value]));
}

describe("security headers", () => {
  it("enforces the production transport, embedding, and content baseline", () => {
    const headers = asRecord("production");

    expect(headers).toMatchObject({
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("form-action 'self'");
    expect(headers["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
  });

  it("keeps development compatible without allowing inline script execution", () => {
    const development = asRecord("development");
    const production = asRecord("production");

    expect(development["Strict-Transport-Security"]).toBeUndefined();
    expect(development["Content-Security-Policy"]).not.toContain("script-src");
    expect(production["Content-Security-Policy"]).not.toContain("unsafe-inline");
  });
});
