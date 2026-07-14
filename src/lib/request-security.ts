import "server-only";

import { isIP } from "node:net";

type HeaderReader = Pick<Headers, "get">;

const allowedClientIpHeaders = new Set([
  "cf-connecting-ip",
  "x-forwarded-for",
  "x-real-ip",
]);

function normalizeIpCandidate(value: string) {
  const candidate = value.trim();
  const bracketedIpv6 = candidate.match(/^\[([^\]]+)](?::\d+)?$/)?.[1];
  if (bracketedIpv6 && isIP(bracketedIpv6)) return bracketedIpv6.toLowerCase();
  if (isIP(candidate)) return candidate.toLowerCase();

  const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/)?.[1];
  return ipv4WithPort && isIP(ipv4WithPort) ? ipv4WithPort : null;
}

export function resolveTrustedClientIp(
  requestHeaders: HeaderReader,
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (environment.AUTH_TRUST_PROXY !== "true") return null;

  const configuredHeader = (
    environment.AUTH_CLIENT_IP_HEADER ?? "x-forwarded-for"
  ).toLowerCase();
  if (!allowedClientIpHeaders.has(configuredHeader)) return null;

  const rawValue = requestHeaders.get(configuredHeader);
  if (!rawValue || rawValue.length > 512) return null;

  const candidate =
    configuredHeader === "x-forwarded-for"
      ? rawValue.split(",")[0]
      : rawValue;
  return candidate ? normalizeIpCandidate(candidate) : null;
}
