import { describe, expect, it, vi } from "vitest";

import { checkMediaStorageReadiness, detectImageMime, getMediaStorageHealth, resolveMediaStorageConfig } from "./media-storage";

describe("media storage validation", () => {
  it("detects supported image signatures", () => {
    expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(detectImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectImageMime(Buffer.from("RIFF0000WEBP", "ascii"))).toBe("image/webp");
  });

  it("rejects extension-only and script content", () => {
    expect(detectImageMime(Buffer.from("<script>alert(1)</script>"))).toBeNull();
    expect(detectImageMime(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
  });
});

describe("media storage configuration", () => {
  it("defaults to local storage only outside production", () => {
    expect(resolveMediaStorageConfig({ NODE_ENV: "development" })).toMatchObject({ provider: "LOCAL" });
  });

  it("requires an explicit durable provider in production", () => {
    expect(() => resolveMediaStorageConfig({ NODE_ENV: "production" })).toThrow("MEDIA_STORAGE_PROVIDER");
    expect(resolveMediaStorageConfig({ NODE_ENV: "production", MEDIA_STORAGE_PROVIDER: "LOCAL" })).toEqual({ provider: "LOCAL" });
    expect(getMediaStorageHealth({ NODE_ENV: "production" })).toEqual({ status: "degraded", provider: "MISCONFIGURED" });
  });

  it("validates S3-compatible credentials and normalizes the prefix", () => {
    expect(() => resolveMediaStorageConfig({ MEDIA_STORAGE_PROVIDER: "S3", MEDIA_S3_BUCKET: "media", MEDIA_S3_REGION: "auto", MEDIA_S3_ACCESS_KEY_ID: "key" })).toThrow("birlikte");
    expect(resolveMediaStorageConfig({
      MEDIA_STORAGE_PROVIDER: "S3",
      MEDIA_S3_BUCKET: "ekolglass-media",
      MEDIA_S3_REGION: "auto",
      MEDIA_S3_ENDPOINT: "https://example.r2.cloudflarestorage.com",
      MEDIA_S3_ACCESS_KEY_ID: "key",
      MEDIA_S3_SECRET_ACCESS_KEY: "secret",
      MEDIA_S3_PREFIX: "/portal/media/",
    })).toMatchObject({ provider: "S3", bucket: "ekolglass-media", region: "auto", prefix: "portal/media", readinessTimeoutMs: 5_000 });
  });

  it("validates the readiness timeout", () => {
    expect(() => resolveMediaStorageConfig({
      MEDIA_STORAGE_PROVIDER: "S3",
      MEDIA_S3_BUCKET: "media",
      MEDIA_S3_REGION: "auto",
      MEDIA_STORAGE_READINESS_TIMEOUT_MS: "999",
    })).toThrow("MEDIA_STORAGE_READINESS_TIMEOUT_MS");
  });
});

describe("media storage readiness", () => {
  const s3Environment = {
    MEDIA_STORAGE_PROVIDER: "S3",
    MEDIA_S3_BUCKET: "ekolglass-media",
    MEDIA_S3_REGION: "auto",
    MEDIA_S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
    MEDIA_STORAGE_READINESS_TIMEOUT_MS: "1500",
  };

  it("probes S3-compatible storage without exposing configuration details", async () => {
    const headBucket = vi.fn().mockResolvedValue({});

    await expect(checkMediaStorageReadiness(s3Environment, { headBucket })).resolves.toEqual({ status: "ok", provider: "S3" });
    expect(headBucket).toHaveBeenCalledWith(expect.anything(), "ekolglass-media", expect.any(AbortSignal));
  });

  it("returns a bounded public failure contract for inaccessible storage", async () => {
    const headBucket = vi.fn().mockRejectedValue(new Error("secret https://private.example/bucket"));

    const result = await checkMediaStorageReadiness(s3Environment, { headBucket });

    expect(result).toEqual({ status: "degraded", provider: "S3", reason: "unreachable" });
    expect(JSON.stringify(result)).not.toContain("private.example");
  });

  it("reports invalid configuration without attempting a probe", async () => {
    const headBucket = vi.fn();

    await expect(checkMediaStorageReadiness({ NODE_ENV: "production" }, { headBucket })).resolves.toEqual({
      status: "degraded",
      provider: "MISCONFIGURED",
      reason: "configuration",
    });
    expect(headBucket).not.toHaveBeenCalled();
  });
});
