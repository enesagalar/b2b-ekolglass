import { describe, expect, it } from "vitest";

import { getSystemAlertConfig, getSystemAlertReadiness } from "./config";

const valid = {
  NODE_ENV: "production",
  SYSTEM_ALERT_PROVIDER: "webhook",
  SYSTEM_ALERT_WEBHOOK_URL: "https://alerts.example.com/ekolglass",
  SYSTEM_ALERT_WEBHOOK_SECRET: "s".repeat(48),
  SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS: "alerts.example.com",
  SYSTEM_ALERT_TIMEOUT_MS: "10000",
};

describe("system alert config", () => {
  it("accepts a production HTTPS allowlisted target", () => {
    expect(getSystemAlertConfig(valid)).toMatchObject({ timeoutMs: 10_000 });
    expect(getSystemAlertReadiness(valid).status).toBe("ready");
  });

  it.each([
    ["private target", { SYSTEM_ALERT_WEBHOOK_URL: "https://127.0.0.1/alert", SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS: "127.0.0.1" }],
    ["IPv6 loopback", { SYSTEM_ALERT_WEBHOOK_URL: "https://[::1]/alert", SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS: "[::1]" }],
    ["metadata target", { SYSTEM_ALERT_WEBHOOK_URL: "https://169.254.169.254/alert", SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS: "169.254.169.254" }],
    ["query secret", { SYSTEM_ALERT_WEBHOOK_URL: "https://alerts.example.com/alert?token=x" }],
    ["host mismatch", { SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS: "other.example.com" }],
    ["weak secret", { SYSTEM_ALERT_WEBHOOK_SECRET: "short" }],
    ["insecure production", { SYSTEM_ALERT_WEBHOOK_URL: "http://alerts.example.com/alert" }],
  ])("rejects %s", (_name, override) => {
    expect(() => getSystemAlertConfig({ ...valid, ...override })).toThrow();
  });

  it("reports disabled without exposing configuration details", () => {
    expect(getSystemAlertReadiness({ SYSTEM_ALERT_PROVIDER: "disabled" })).toEqual({ enabled: false, provider: "disabled", status: "disabled" });
  });
});
