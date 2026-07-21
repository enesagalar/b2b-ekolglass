import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePublicEvidence, isPublicIp, parseArguments, robotsEvidence, sanitizeHealth, sanitizeLiveness, sitemapLocations, validateBaseUrl } from "./collect-production-evidence.mjs";

const requiredArguments = [
  "--base-url=https://portal.ekolglass.com",
  `--expected-commit-sha=${"a".repeat(40)}`,
  `--expected-artifact-digest=sha256:${"b".repeat(64)}`,
  "--expected-release-id=production-1",
  "--expected-dns-targets=portal.provider.example",
];

test("accepts only clean HTTPS origins and explicit HTTP localhost", () => {
  assert.equal(validateBaseUrl("https://portal.ekolglass.com").origin, "https://portal.ekolglass.com");
  assert.equal(validateBaseUrl("http://127.0.0.1:3000", true).origin, "http://127.0.0.1:3000");
  assert.equal(validateBaseUrl("http://[::1]:3000", true).origin, "http://[::1]:3000");
  for (const value of [
    "http://portal.ekolglass.com",
    "https://user:secret@portal.ekolglass.com",
    "https://portal.ekolglass.com/path",
    "https://portal.ekolglass.com?token=secret",
    "https://portal.ekolglass.com#fragment",
    "https://127.0.0.1",
  ]) assert.throws(() => validateBaseUrl(value), /temiz bir HTTPS origin/);
});

test("rejects unsafe output paths and invalid timeout values", () => {
  assert.throws(() => parseArguments([...requiredArguments, "--output=../secret.json"]), /repository icinde/);
  assert.throws(() => parseArguments([...requiredArguments, "--timeout-ms=999"]), /1000 ile 30000/);
  assert.throws(() => parseArguments([...requiredArguments, "--unknown=value"]), /Bilinmeyen/);
  assert.throws(() => parseArguments(requiredArguments.filter((argument) => !argument.startsWith("--expected-commit-sha="))), /Expected commit SHA/);
});

test("classifies private, loopback, documentation, and public addresses", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "203.0.113.5", "::1", "fd00::1", "2001:db8::1"]) assert.equal(isPublicIp(address), false);
  assert.equal(isPublicIp("8.8.8.8"), true);
  assert.equal(isPublicIp("2606:4700:4700::1111"), true);
});

test("stores only allowlisted health, release, robots, and sitemap evidence", () => {
  const health = sanitizeHealth({ status: "ok", database: "ok", token: "secret-token", connectionString: "file:/private.db" });
  const liveness = sanitizeLiveness({
    status: "ok",
    release: { commitSha: "a".repeat(40), artifactDigest: `sha256:${"b".repeat(64)}`, releaseId: "production-1", password: "secret" },
    cookie: "session-secret",
  });
  const sitemap = sitemapLocations("<urlset><url><loc>https://portal.ekolglass.com/urunler?token=secret</loc></url></urlset>");
  const robots = robotsEvidence(`${requiredRobots()}\nSitemap: https://portal.ekolglass.com/sitemap.xml\nSecret: hidden`, "https://portal.ekolglass.com");
  const serialized = JSON.stringify({ health, liveness, sitemap, robots });

  assert.equal(serialized.includes("secret"), false);
  assert.deepEqual(sitemap, ["INVALID_URL"]);
  assert.deepEqual(robots, { requiredRulesPresent: true, canonicalSitemap: true });
});

test("public gate requires health, headers, public sitemap, DNS, TLS, and clean git", () => {
  const evidence = fixture();
  assert.equal(evaluatePublicEvidence(evidence).status, "pass");

  evidence.http.sitemap.locations.push("https://portal.ekolglass.com/admin");
  evidence.git.dirty = true;
  const failed = evaluatePublicEvidence(evidence);
  assert.equal(failed.status, "fail");
  assert.deepEqual(failed.checks.filter((check) => !check.passed).map((check) => check.name), ["sitemap_public_only", "collector_git_provenance"]);
});

test("public gate requires every internal endpoint to reject the secret-safe probe", () => {
  const evidence = fixture();
  evidence.internalAuth[1].status = 200;

  const failed = evaluatePublicEvidence(evidence);
  assert.equal(failed.status, "fail");
  assert.deepEqual(failed.checks.filter((check) => !check.passed).map((check) => check.name), ["internal_auth_boundaries"]);
  const serialized = JSON.stringify(evidence.internalAuth);
  assert.equal(serialized.includes("evidence-probe"), false);
  assert.equal(serialized.includes("body"), false);
});

function fixture() {
  return {
    target: { origin: "https://portal.ekolglass.com", protocol: "https:" },
    transport: { httpRedirect: { status: "ok", httpStatus: 308, sameHostHttps: true } },
    expectedRelease: { commitSha: "a".repeat(40), artifactDigest: `sha256:${"b".repeat(64)}`, releaseId: "production-1" },
    expectedDnsTargets: ["portal.provider.example"],
    git: { commit: "a".repeat(40), dirty: false },
    dns: { status: "ok", addresses: ["8.8.8.8"], cnames: ["portal.provider.example"] },
    tls: { status: "ok", authorized: true, daysRemaining: 90 },
    internalAuth: [
      "/api/internal/outbox",
      "/api/internal/backup",
      "/api/internal/alerts",
      "/api/internal/maintenance/system-jobs",
      "/api/internal/maintenance/auth-rate-limit",
    ].map((pathname) => ({
      method: "POST",
      pathname,
      status: 401,
      jsonErrorContract: true,
      cacheNoStore: true,
      requestIdPresent: true,
      setCookieAbsent: true,
    })),
    http: {
      home: {
        status: 200,
        headers: {
          "content-security-policy": "object-src 'none'; frame-ancestors 'none'",
          "permissions-policy": "camera=()",
          "referrer-policy": "strict-origin-when-cross-origin",
          "strict-transport-security": "max-age=63072000; includeSubDomains",
          "x-content-type-options": "nosniff",
          "x-frame-options": "DENY",
        },
      },
      liveness: { status: 200, headers: { "cache-control": "no-store" }, data: { status: "ok", release: { commitSha: "a".repeat(40), artifactDigest: `sha256:${"b".repeat(64)}`, releaseId: "production-1" } } },
      readiness: { status: 200, headers: { "cache-control": "no-store" }, data: { status: "ready", checks: { environment: "ok", database: "ok", mediaStorage: "ok" } } },
      health: { status: 200, headers: { "cache-control": "no-store" }, data: { status: "ok" } },
      robots: { status: 200, requiredRulesPresent: true, canonicalSitemap: true },
      sitemap: { status: 200, locations: ["https://portal.ekolglass.com", "https://portal.ekolglass.com/urunler", "https://portal.ekolglass.com/bayi-basvurusu"] },
    },
  };
}

function requiredRobots() {
  return ["User-agent: *", "Disallow: /admin", "Disallow: /yonetim", "Disallow: /bayi/", "Disallow: /giris", "Disallow: /aktivasyon/", "Disallow: /parola-sifirla/", "Disallow: /api/"].join("\n");
}
