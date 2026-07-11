import { describe, expect, it } from "vitest";

import { ACTIVATION_TOKEN_HOURS, createActivationToken, getActivationExpiry, hashActivationToken } from "./activation-token";

describe("activation token helpers", () => {
  it("creates high-entropy url-safe tokens and stable hashes", () => {
    const first = createActivationToken();
    const second = createActivationToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
    expect(hashActivationToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashActivationToken(first)).toBe(hashActivationToken(first));
  });

  it("expires invitations after the configured duration", () => {
    const now = new Date("2026-07-11T10:00:00.000Z");
    expect(getActivationExpiry(now).getTime() - now.getTime()).toBe(ACTIVATION_TOKEN_HOURS * 60 * 60 * 1000);
  });
});
