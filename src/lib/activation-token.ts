import "server-only";

import { createHash, randomBytes } from "crypto";

export const ACTIVATION_TOKEN_HOURS = 48;

export function createActivationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getActivationExpiry(now = new Date()) {
  return new Date(now.getTime() + ACTIVATION_TOKEN_HOURS * 60 * 60 * 1000);
}
