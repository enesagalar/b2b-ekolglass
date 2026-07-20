import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { listLocalMediaFiles, listS3MediaObjects, reconcileLocalMedia, reconcileMedia } from "./media-reconciliation";
import type { MediaStorageConfig } from "./media-storage";

const jpg = `${"a".repeat(64)}.jpg`;
const png = `${"b".repeat(64)}.png`;
const webp = `${"c".repeat(64)}.webp`;

describe("local media reconciliation", () => {
  it("reports active and inactive references without changing either input", () => {
    const records = [
      { objectKey: png, isActive: false },
      { objectKey: jpg, isActive: true },
      { objectKey: webp, isActive: true },
      { objectKey: "unsafe.png", isActive: false },
    ];
    const files = [jpg, png, `${"d".repeat(64)}.webp`, "notes.txt"];

    const report = reconcileLocalMedia(records, files, 1);

    expect(report.records).toEqual({ total: 4, active: 2, inactive: 2 });
    expect(report.referenced).toEqual({ total: 2, active: 1, inactive: 1 });
    expect(report.missing).toEqual({ total: 1, active: 1, inactive: 0 });
    expect(report.orphan.count).toBe(1);
    expect(report.invalidFilename).toEqual({ count: 2, recordCount: 1, storedObjectCount: 1 });
    expect(Object.values(report.samples).every((sample) => sample.length <= 1)).toBe(true);
    expect(records.map((record) => record.objectKey)).toEqual([png, jpg, webp, "unsafe.png"]);
    expect(files).toEqual([jpg, png, `${"d".repeat(64)}.webp`, "notes.txt"]);
  });

  it("deduplicates filenames returned by a storage listing", () => {
    const report = reconcileLocalMedia([], [jpg, jpg, "bad", "bad"]);

    expect(report.storageObjects).toBe(2);
    expect(report.orphan.count).toBe(1);
    expect(report.invalidFilename.storedObjectCount).toBe(1);
  });

  it("rejects invalid sample limits", () => {
    expect(() => reconcileLocalMedia([], [], -1)).toThrow("sampleLimit");
    expect(() => reconcileLocalMedia([], [], 1.5)).toThrow("sampleLimit");
  });
});

describe("S3 media reconciliation", () => {
  const config: Extract<MediaStorageConfig, { provider: "S3" }> = {
    provider: "S3",
    bucket: "ekolglass-media",
    region: "auto",
    endpoint: "https://account.r2.cloudflarestorage.com",
    forcePathStyle: false,
    prefix: "portal/media",
    readinessTimeoutMs: 5_000,
  };

  it("lists every page and removes only the configured prefix", async () => {
    const listObjects = vi.fn()
      .mockResolvedValueOnce({
        Contents: [{ Key: `portal/media/${jpg}` }, { Key: "outside/ignored.jpg" }],
        IsTruncated: true,
        NextContinuationToken: "page-2",
        $metadata: {},
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: `portal/media/${png}` }, { Key: "portal/media/nested/invalid.webp" }],
        IsTruncated: false,
        $metadata: {},
      });

    await expect(listS3MediaObjects(config, 10, { listObjects })).resolves.toEqual([jpg, png, "nested/invalid.webp"]);
    expect(listObjects).toHaveBeenNthCalledWith(2, expect.anything(), expect.objectContaining({ ContinuationToken: "page-2" }));
    expect(reconcileMedia([{ objectKey: jpg, isActive: true }], [jpg, png], "S3")).toMatchObject({
      provider: "S3",
      storageObjects: 2,
      referenced: { total: 1 },
      orphan: { count: 1 },
    });
  });

  it("stops on unsafe listing size and invalid pagination", async () => {
    const tooMany = vi.fn().mockResolvedValue({
      Contents: [{ Key: `portal/media/${jpg}` }, { Key: `portal/media/${png}` }],
      IsTruncated: false,
      $metadata: {},
    });
    await expect(listS3MediaObjects(config, 1, { listObjects: tooMany })).rejects.toThrow("safety limit");

    const invalidPagination = vi.fn().mockResolvedValue({ Contents: [], IsTruncated: true, $metadata: {} });
    await expect(listS3MediaObjects(config, 10, { listObjects: invalidPagination })).rejects.toThrow("continuation token");
  });
});

describe("local media file listing", () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  it("returns files only and treats a missing storage directory as empty", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "media-reconciliation-"));
    temporaryDirectories.push(root);
    await writeFile(path.join(root, jpg), "image");

    await expect(listLocalMediaFiles(root)).resolves.toEqual([jpg]);
    await expect(listLocalMediaFiles(path.join(root, "missing"))).resolves.toEqual([]);
  });
});
