import { describe, expect, it } from "vitest";

import {
  PASSWORD_RESET_TOKEN_HOURS,
  createPasswordResetToken,
  getPasswordResetExpiry,
  hashPasswordResetToken,
} from "./password-reset-token";

describe("password reset token helpers", () => {
  it("creates unique url-safe tokens and stable non-reversible fingerprints", () => {
    const first = createPasswordResetToken();
    const second = createPasswordResetToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
    expect(hashPasswordResetToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPasswordResetToken(first)).toBe(hashPasswordResetToken(first));
    expect(hashPasswordResetToken(first)).not.toContain(first);
  });

  it("expires reset invitations after the configured duration", () => {
    const now = new Date("2026-07-13T10:00:00.000Z");

    expect(getPasswordResetExpiry(now).getTime() - now.getTime()).toBe(
      PASSWORD_RESET_TOKEN_HOURS * 60 * 60 * 1000,
    );
  });
});
