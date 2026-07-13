import "server-only";

import { createHmac } from "node:crypto";

import { isStrongRuntimeSecret } from "./secret-policy";

export type CredentialTokenPurpose = "activation" | "password-reset";

function credentialLinkSecret() {
  const secret =
    process.env.CREDENTIAL_LINK_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : process.env.AUTH_SECRET);
  if (!isStrongRuntimeSecret(secret)) {
    throw new Error("Credential link secret en az 32 karakter olmalıdır.");
  }
  return secret;
}

export function deriveCredentialToken(
  purpose: CredentialTokenPurpose,
  tokenId: string,
) {
  return createHmac("sha256", credentialLinkSecret())
    .update(`ekolglass-b2b:${purpose}:v1:${tokenId}`)
    .digest("base64url");
}
