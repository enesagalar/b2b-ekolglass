import "server-only";

import { timingSafeEqual } from "node:crypto";

const KNOWN_PLACEHOLDERS = new Set([
  "replace-with-a-separate-long-random-secret",
  "replace-with-a-long-random-secret",
]);

export function isStrongRuntimeSecret(
  secret: string | undefined,
): secret is string {
  return Boolean(
    secret &&
    secret.length >= 32 &&
    !KNOWN_PLACEHOLDERS.has(secret) &&
    !secret.toLowerCase().startsWith("replace-with"),
  );
}

export function matchesBearerSecret(
  authorization: string | null,
  secret: string | undefined,
) {
  if (!isStrongRuntimeSecret(secret)) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
