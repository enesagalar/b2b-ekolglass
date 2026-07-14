import { describe, expect, it } from "vitest";

import { detectImageMime, getMediaStorageHealth, resolveMediaStorageConfig } from "./media-storage";

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
    })).toMatchObject({ provider: "S3", bucket: "ekolglass-media", region: "auto", prefix: "portal/media" });
  });
});
