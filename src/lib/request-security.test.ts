import { describe, expect, it } from "vitest";

import { requiresTrustedClientIp, resolveTrustedClientIp } from "./request-security";

function requestHeaders(values: Record<string, string>) {
  return new Headers(values);
}

describe("trusted client IP resolution", () => {
  it("ignores forwarding headers unless the proxy is explicitly trusted", () => {
    expect(resolveTrustedClientIp(
      requestHeaders({ "x-forwarded-for": "203.0.113.10" }),
      { NODE_ENV: "test", AUTH_TRUST_PROXY: "false" },
    )).toBeNull();
  });

  it("uses the first valid forwarded address behind a trusted overwriting proxy", () => {
    expect(resolveTrustedClientIp(
      requestHeaders({ "x-forwarded-for": "203.0.113.10, 10.0.0.4" }),
      {
        NODE_ENV: "test",
        AUTH_TRUST_PROXY: "true",
        AUTH_CLIENT_IP_HEADER: "x-forwarded-for",
      },
    )).toBe("203.0.113.10");
  });

  it("normalizes bracketed IPv6 and IPv4 ports", () => {
    expect(resolveTrustedClientIp(
      requestHeaders({ "x-real-ip": "[2001:db8::1]:443" }),
      { NODE_ENV: "test", AUTH_TRUST_PROXY: "true", AUTH_CLIENT_IP_HEADER: "x-real-ip" },
    )).toBe("2001:db8::1");
    expect(resolveTrustedClientIp(
      requestHeaders({ "x-real-ip": "203.0.113.10:8443" }),
      { NODE_ENV: "test", AUTH_TRUST_PROXY: "true", AUTH_CLIENT_IP_HEADER: "x-real-ip" },
    )).toBe("203.0.113.10");
  });

  it("rejects malformed values and unapproved header names", () => {
    expect(resolveTrustedClientIp(
      requestHeaders({ "x-forwarded-for": "not-an-ip" }),
      { NODE_ENV: "test", AUTH_TRUST_PROXY: "true" },
    )).toBeNull();
    expect(resolveTrustedClientIp(
      requestHeaders({ "x-client-ip": "203.0.113.10" }),
      { NODE_ENV: "test", AUTH_TRUST_PROXY: "true", AUTH_CLIENT_IP_HEADER: "x-client-ip" },
    )).toBeNull();
  });
});

describe("trusted client IP requirement", () => {
  it("fails closed for a real production origin but permits localhost previews", () => {
    expect(requiresTrustedClientIp({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://portal.ekolglass.com" })).toBe(true);
    expect(requiresTrustedClientIp({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toBe(false);
    expect(requiresTrustedClientIp({ NODE_ENV: "test" })).toBe(false);
    expect(requiresTrustedClientIp({ NODE_ENV: "production" })).toBe(true);
  });
});
