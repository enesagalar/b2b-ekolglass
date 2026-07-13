import "server-only";

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
