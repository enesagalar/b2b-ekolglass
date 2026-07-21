import { execFile } from "node:child_process";
import { lookup, resolveCname } from "node:dns/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import tls from "node:tls";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const maxResponseBytes = 64 * 1024;
const requiredRobotsRules = ["Disallow: /admin", "Disallow: /yonetim", "Disallow: /bayi/", "Disallow: /giris", "Disallow: /aktivasyon/", "Disallow: /parola-sifirla/", "Disallow: /api/"];
const expectedSitemapPaths = ["/", "/urunler", "/bayi-basvurusu"];
const internalAuthPaths = [
  "/api/internal/outbox",
  "/api/internal/backup",
  "/api/internal/alerts",
  "/api/internal/maintenance/system-jobs",
  "/api/internal/maintenance/auth-rate-limit",
];
const invalidProbeAuthorization = "Bearer evidence-probe";

export function parseArguments(argv, environment = process.env) {
  const options = {
    baseUrl: environment.EVIDENCE_BASE_URL,
    expectedCommitSha: environment.EVIDENCE_EXPECTED_COMMIT_SHA,
    expectedArtifactDigest: environment.EVIDENCE_EXPECTED_ARTIFACT_DIGEST,
    expectedReleaseId: environment.EVIDENCE_EXPECTED_RELEASE_ID,
    expectedDnsTargets: environment.EVIDENCE_EXPECTED_DNS_TARGETS,
    output: environment.EVIDENCE_OUTPUT,
    timeoutMs: 10_000,
    allowHttpLocalhost: false,
  };

  for (const argument of argv) {
    if (argument === "--allow-http-localhost") options.allowHttpLocalhost = true;
    else if (argument.startsWith("--base-url=")) options.baseUrl = argument.slice("--base-url=".length);
    else if (argument.startsWith("--expected-commit-sha=")) options.expectedCommitSha = argument.slice("--expected-commit-sha=".length);
    else if (argument.startsWith("--expected-artifact-digest=")) options.expectedArtifactDigest = argument.slice("--expected-artifact-digest=".length);
    else if (argument.startsWith("--expected-release-id=")) options.expectedReleaseId = argument.slice("--expected-release-id=".length);
    else if (argument.startsWith("--expected-dns-targets=")) options.expectedDnsTargets = argument.slice("--expected-dns-targets=".length);
    else if (argument.startsWith("--output=")) options.output = argument.slice("--output=".length);
    else if (argument.startsWith("--timeout-ms=")) options.timeoutMs = Number(argument.slice("--timeout-ms=".length));
    else throw new Error("Bilinmeyen production evidence parametresi.");
  }

  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1_000 || options.timeoutMs > 30_000) {
    throw new Error("Evidence timeout 1000 ile 30000 arasinda olmalidir.");
  }
  options.baseUrl = validateBaseUrl(options.baseUrl, options.allowHttpLocalhost).origin;
  options.expectedCommitSha = requiredPattern(options.expectedCommitSha, /^[a-f0-9]{40}$/i, "Expected commit SHA").toLowerCase();
  options.expectedArtifactDigest = requiredPattern(options.expectedArtifactDigest, /^sha256:[a-f0-9]{64}$/i, "Expected artifact digest").toLowerCase();
  options.expectedReleaseId = requiredPattern(options.expectedReleaseId, /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/, "Expected release ID");
  options.expectedDnsTargets = parseExpectedDnsTargets(options.expectedDnsTargets);
  if (options.output) options.output = resolveSafeOutputPath(options.output);
  return options;
}

function requiredPattern(value, pattern, label) {
  const normalized = value?.trim();
  if (!normalized || !pattern.test(normalized)) throw new Error(`${label} gecersiz veya eksik.`);
  return normalized;
}

function parseExpectedDnsTargets(value) {
  const targets = [...new Set((value ?? "").split(",").map((item) => item.trim().toLowerCase().replace(/\.$/, "")).filter(Boolean))];
  if (!targets.length || targets.some((target) => (isIP(target) ? !isPublicIp(target) : !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(target)))) {
    throw new Error("En az bir gecerli expected DNS target zorunludur.");
  }
  return targets;
}

export function validateBaseUrl(value, allowHttpLocalhost = false) {
  let url;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new Error("Gecerli bir production evidence base URL zorunludur.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const protocolAllowed = url.protocol === "https:" || (allowHttpLocalhost && isLocalhost && url.protocol === "http:");
  const unsafeIp = isIP(hostname) && !isPublicIp(hostname) && !(allowHttpLocalhost && isLocalhost);
  if (!protocolAllowed || (!allowHttpLocalhost && isLocalhost) || unsafeIp || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Evidence base URL temiz bir HTTPS origin olmalidir.");
  }
  return url;
}

function resolveSafeOutputPath(value) {
  const root = path.resolve(process.cwd());
  const output = path.resolve(root, value);
  const relative = path.relative(root, output);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Evidence output repository icinde bir dosya olmalidir.");
  }
  return output;
}

async function readLimitedText(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxResponseBytes) {
      await reader.cancel();
      throw new Error("response_too_large");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function selectedHeaders(headers) {
  return Object.fromEntries([
    "content-security-policy",
    "cache-control",
    "permissions-policy",
    "referrer-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "x-request-id",
  ].map((key) => [key, headers.get(key)]));
}

async function requestEndpoint(baseUrl, pathname, timeoutMs) {
  try {
    const response = await fetch(new URL(pathname, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: pathname.startsWith("/api/") ? "application/json" : "text/plain, text/html, application/xml" },
    });
    return {
      status: response.status,
      headers: selectedHeaders(response.headers),
      body: await readLimitedText(response),
    };
  } catch {
    return { status: 0, headers: {}, body: "", error: "request_failed" };
  }
}

async function probeInternalAuthBoundary(baseUrl, pathname, timeoutMs) {
  try {
    const response = await fetch(new URL(pathname, baseUrl), {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "application/json",
        authorization: invalidProbeAuthorization,
      },
    });
    const data = safeJson(await readLimitedText(response));
    const requestId = response.headers.get("x-request-id")?.trim() ?? "";
    return {
      method: "POST",
      pathname,
      status: response.status,
      jsonErrorContract: Boolean(data && typeof data === "object" && !Array.isArray(data) && typeof data.error === "string"),
      cacheNoStore: response.headers.get("cache-control")?.includes("no-store") === true,
      requestIdPresent: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId),
      setCookieAbsent: !response.headers.has("set-cookie"),
    };
  } catch {
    return {
      method: "POST",
      pathname,
      status: 0,
      jsonErrorContract: false,
      cacheNoStore: false,
      requestIdPresent: false,
      setCookieAbsent: false,
      error: "request_failed",
    };
  }
}

async function internalAuthEvidence(baseUrl, timeoutMs) {
  return Promise.all(internalAuthPaths.map((pathname) => probeInternalAuthBoundary(baseUrl, pathname, timeoutMs)));
}

async function httpRedirectEvidence(target, timeoutMs) {
  if (target.protocol !== "https:") return { status: "skipped", reason: "http_localhost" };
  try {
    const insecureOrigin = new URL(target.origin);
    insecureOrigin.protocol = "http:";
    insecureOrigin.port = "";
    insecureOrigin.pathname = "/";
    const response = await fetch(insecureOrigin, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    let sameHostHttps = false;
    try {
      const redirect = new URL(response.headers.get("location") ?? "", `http://${target.hostname}/`);
      sameHostHttps = redirect.protocol === "https:" && redirect.hostname === target.hostname && !redirect.username && !redirect.password;
    } catch {}
    return { status: "ok", httpStatus: response.status, sameHostHttps };
  } catch {
    return { status: "error", reason: "request_failed" };
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function sanitizeHealth(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries([
    "status",
    "database",
    "outbox",
    "authentication",
    "mediaStorage",
    "mediaStorageProvider",
    "systemJobs",
    "systemJobsSeverity",
    "timestamp",
  ].filter((key) => typeof value[key] === "string").map((key) => [key, value[key]]));
}

export function sanitizeReadiness(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const checks = value.checks && typeof value.checks === "object"
    ? Object.fromEntries(["environment", "database", "mediaStorage"].filter((key) => typeof value.checks[key] === "string").map((key) => [key, value.checks[key]]))
    : null;
  return {
    status: typeof value.status === "string" ? value.status : null,
    checks,
    issueKeys: Array.isArray(value.issueKeys) ? value.issueKeys.filter((item) => typeof item === "string").slice(0, 100) : [],
    timestamp: typeof value.timestamp === "string" ? value.timestamp : null,
  };
}

export function sanitizeLiveness(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const release = value.release && typeof value.release === "object" && !Array.isArray(value.release)
    ? {
        commitSha: typeof value.release.commitSha === "string" && /^[a-f0-9]{40}$/i.test(value.release.commitSha) ? value.release.commitSha.toLowerCase() : null,
        artifactDigest: typeof value.release.artifactDigest === "string" && /^sha256:[a-f0-9]{64}$/i.test(value.release.artifactDigest) ? value.release.artifactDigest.toLowerCase() : null,
        releaseId: typeof value.release.releaseId === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value.release.releaseId) ? value.release.releaseId : null,
      }
    : null;
  return { status: typeof value.status === "string" ? value.status : null, release, timestamp: typeof value.timestamp === "string" ? value.timestamp : null };
}

export function isPublicIp(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && ((b === 0 && (c === 0 || c === 2)) || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (family === 6) {
    const normalized = address.toLowerCase().split("%")[0];
    if (normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd")) return false;
    if (/^fe[89ab]/.test(normalized) || normalized.startsWith("2001:db8:")) return false;
    if (normalized.startsWith("::ffff:")) return isPublicIp(normalized.slice("::ffff:".length));
    return true;
  }
  return false;
}

async function gitMetadata() {
  const run = async (...args) => (await execFileAsync("git", args, { cwd: process.cwd(), windowsHide: true })).stdout.trim();
  try {
    return {
      commit: await run("rev-parse", "HEAD"),
      branch: await run("branch", "--show-current"),
      dirty: Boolean(await run("status", "--porcelain")),
      repository: (await run("config", "--get", "remote.origin.url")).replace(/https:\/\/[^/@]+@/i, "https://[REDACTED]@"),
    };
  } catch {
    return { commit: null, branch: null, dirty: null, repository: null };
  }
}

async function dnsEvidence(hostname) {
  try {
    const [addresses, cnames] = await Promise.all([
      lookup(hostname, { all: true, verbatim: true }),
      resolveCname(hostname).catch(() => []),
    ]);
    return {
      status: "ok",
      addresses: [...new Set(addresses.map(({ address }) => address.toLowerCase()))].sort(),
      cnames: [...new Set(cnames.map((value) => value.toLowerCase().replace(/\.$/, "")))].sort(),
    };
  } catch {
    return { status: "error", addresses: [], cnames: [] };
  }
}

async function tlsEvidence(url, timeoutMs) {
  if (url.protocol !== "https:") return { status: "skipped", reason: "http_localhost" };
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: hostname,
      port: Number(url.port || 443),
      servername: isIP(hostname) ? undefined : hostname,
      rejectUnauthorized: true,
    });
    const finish = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs, () => finish({ status: "error", reason: "timeout" }));
    socket.once("error", () => finish({ status: "error", reason: "handshake_failed" }));
    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      finish({
        status: "ok",
        authorized: socket.authorized,
        protocol: socket.getProtocol(),
        subjectCommonName: certificate.subject?.CN ?? null,
        issuerCommonName: certificate.issuer?.CN ?? null,
        validFrom: certificate.valid_from ?? null,
        validTo: certificate.valid_to ?? null,
        daysRemaining: certificate.valid_to ? Math.floor((new Date(certificate.valid_to).getTime() - Date.now()) / 86_400_000) : null,
        fingerprint256: certificate.fingerprint256 ?? null,
      });
    });
  });
}

export function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => {
    try {
      const url = new URL(match[1].trim());
      if (url.username || url.password || url.search || url.hash) return "INVALID_URL";
      return `${url.origin}${url.pathname}`;
    } catch {
      return "INVALID_URL";
    }
  }).slice(0, 10_000);
}

export function robotsEvidence(body, baseUrl) {
  const sitemapLine = body.split(/\r?\n/).find((line) => line.toLowerCase().startsWith("sitemap:"));
  let canonicalSitemap = false;
  try {
    const sitemap = new URL(sitemapLine?.slice("sitemap:".length).trim() ?? "");
    canonicalSitemap = sitemap.href === new URL("/sitemap.xml", baseUrl).href;
  } catch {}
  return {
    requiredRulesPresent: requiredRobotsRules.every((rule) => body.includes(rule)),
    canonicalSitemap,
  };
}

export function evaluatePublicEvidence(evidence) {
  const headers = evidence.http.home.headers;
  const health = evidence.http.health.data;
  const readiness = evidence.http.readiness.data;
  const live = evidence.http.liveness.data;
  const sitemapUrls = evidence.http.sitemap.locations;
  const expectedOrigin = evidence.target.origin;
  const actualRelease = live?.release;
  const internalAuth = Array.isArray(evidence.internalAuth) ? evidence.internalAuth : [];
  const dnsValues = [...evidence.dns.addresses, ...evidence.dns.cnames];
  const sitemapPaths = sitemapUrls.map((value) => {
    try {
      const url = new URL(value);
      return url.origin === expectedOrigin && !url.search && !url.hash ? url.pathname : null;
    } catch {
      return null;
    }
  });
  const checks = [
    ["home_http_200", evidence.http.home.status === 200],
    ["http_to_https_redirect", evidence.transport.httpRedirect.status === "skipped" || (evidence.transport.httpRedirect.status === "ok" && [301, 302, 307, 308].includes(evidence.transport.httpRedirect.httpStatus) && evidence.transport.httpRedirect.sameHostHttps)],
    ["liveness", evidence.http.liveness.status === 200 && live?.status === "ok"],
    ["readiness", evidence.http.readiness.status === 200 && readiness?.status === "ready" && Object.values(readiness.checks ?? {}).every((value) => value === "ok")],
    ["operational_health", evidence.http.health.status === 200 && health?.status === "ok"],
    ["release_identity", actualRelease?.commitSha === evidence.expectedRelease.commitSha && actualRelease?.artifactDigest === evidence.expectedRelease.artifactDigest && actualRelease?.releaseId === evidence.expectedRelease.releaseId],
    ["health_cache_control", [evidence.http.liveness, evidence.http.readiness, evidence.http.health].every((item) => item.headers?.["cache-control"]?.includes("no-store"))],
    ["csp_frame_boundary", headers["content-security-policy"]?.includes("frame-ancestors 'none'") === true],
    ["mime_sniffing_disabled", headers["x-content-type-options"] === "nosniff"],
    ["frame_options", headers["x-frame-options"] === "DENY"],
    ["referrer_policy", headers["referrer-policy"] === "strict-origin-when-cross-origin"],
    ["permissions_policy", typeof headers["permissions-policy"] === "string" && headers["permissions-policy"].includes("camera=()")],
    ["hsts", evidence.target.protocol !== "https:" || headers["strict-transport-security"]?.includes("max-age=") === true],
    ["robots_private_boundaries", evidence.http.robots.status === 200 && evidence.http.robots.requiredRulesPresent && evidence.http.robots.canonicalSitemap],
    ["sitemap_public_only", evidence.http.sitemap.status === 200 && sitemapPaths.length === expectedSitemapPaths.length && new Set(sitemapPaths).size === sitemapPaths.length && expectedSitemapPaths.every((pathname) => sitemapPaths.includes(pathname))],
    ["dns_resolution", evidence.dns.status === "ok" && evidence.dns.addresses.length > 0 && evidence.dns.addresses.every(isPublicIp)],
    ["dns_target", evidence.expectedDnsTargets.some((target) => dnsValues.includes(target))],
    ["tls_certificate", evidence.tls.status === "ok" ? evidence.tls.authorized === true && evidence.tls.daysRemaining >= 30 : evidence.tls.status === "skipped"],
    ["internal_auth_boundaries", internalAuth.length === internalAuthPaths.length && new Set(internalAuth.map((probe) => probe.pathname)).size === internalAuthPaths.length && internalAuth.every((probe) =>
      probe.method === "POST" &&
      internalAuthPaths.includes(probe.pathname) &&
      probe.status === 401 &&
      probe.jsonErrorContract &&
      probe.cacheNoStore &&
      probe.requestIdPresent &&
      probe.setCookieAbsent
    )],
    ["collector_git_provenance", evidence.git.dirty === false && evidence.git.commit === evidence.expectedRelease.commitSha],
  ].map(([name, passed]) => ({ name, passed: Boolean(passed) }));
  return { status: checks.every((check) => check.passed) ? "pass" : "fail", checks };
}

export async function collectPublicEvidence(options) {
  const target = new URL(options.baseUrl);
  const hostname = target.hostname.replace(/^\[|\]$/g, "");
  const [home, liveness, readiness, health, robots, sitemap, internalAuth, git, dns, tlsResult, httpRedirect] = await Promise.all([
    requestEndpoint(options.baseUrl, "/", options.timeoutMs),
    requestEndpoint(options.baseUrl, "/api/health/live", options.timeoutMs),
    requestEndpoint(options.baseUrl, "/api/health/ready", options.timeoutMs),
    requestEndpoint(options.baseUrl, "/api/health", options.timeoutMs),
    requestEndpoint(options.baseUrl, "/robots.txt", options.timeoutMs),
    requestEndpoint(options.baseUrl, "/sitemap.xml", options.timeoutMs),
    internalAuthEvidence(options.baseUrl, options.timeoutMs),
    gitMetadata(),
    dnsEvidence(hostname),
    tlsEvidence(target, options.timeoutMs),
    httpRedirectEvidence(target, options.timeoutMs),
  ]);
  const evidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    target: { origin: target.origin, hostname, protocol: target.protocol },
    expectedRelease: { commitSha: options.expectedCommitSha, artifactDigest: options.expectedArtifactDigest, releaseId: options.expectedReleaseId },
    expectedDnsTargets: options.expectedDnsTargets,
    git,
    dns,
    tls: tlsResult,
    transport: { httpRedirect },
    internalAuth,
    http: {
      home: { status: home.status, headers: home.headers, error: home.error ?? null },
      liveness: { status: liveness.status, data: sanitizeLiveness(safeJson(liveness.body)), headers: liveness.headers, error: liveness.error ?? null },
      readiness: { status: readiness.status, data: sanitizeReadiness(safeJson(readiness.body)), headers: readiness.headers, error: readiness.error ?? null },
      health: { status: health.status, data: sanitizeHealth(safeJson(health.body)), headers: health.headers, error: health.error ?? null },
      robots: { status: robots.status, ...robotsEvidence(robots.body, options.baseUrl), error: robots.error ?? null },
      sitemap: { status: sitemap.status, locations: sitemapLocations(sitemap.body), error: sitemap.error ?? null },
    },
    releaseDecision: "OPERATOR_EVIDENCE_REQUIRED",
  };
  evidence.publicGate = evaluatePublicEvidence(evidence);
  return evidence;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const evidence = await collectPublicEvidence(options);
  const output = `${JSON.stringify(evidence, null, 2)}\n`;
  if (options.output) {
    await mkdir(path.dirname(options.output), { recursive: true });
    await writeFile(options.output, output, { encoding: "utf8", flag: "wx" });
  }
  process.stdout.write(output);
  if (evidence.publicGate.status !== "pass") process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch(() => {
    process.stderr.write("Production evidence collection baslatilamadi.\n");
    process.exitCode = 1;
  });
}
