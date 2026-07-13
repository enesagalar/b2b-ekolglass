import "server-only";

import { createHash, randomBytes } from "crypto";

import { deriveCredentialToken } from "./credential-link-token";

export const PASSWORD_RESET_TOKEN_HOURS = 2;

export function createPasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function derivePasswordResetToken(tokenId: string) {
  return deriveCredentialToken("password-reset", tokenId);
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetExpiry(now = new Date()) {
  return new Date(now.getTime() + PASSWORD_RESET_TOKEN_HOURS * 60 * 60 * 1000);
}
