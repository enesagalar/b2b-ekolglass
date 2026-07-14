import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { listLocalMediaFiles, reconcileLocalMedia, requireLocalMediaProvider } from "./media-reconciliation";

const jpg = `${"a".repeat(64)}.jpg`;
const png = `${"b".repeat(64)}.png`;
const webp = `${"c".repeat(64)}.webp`;

describe("local media reconciliation", () => {
  it("fails clearly for S3 without attempting reconciliation", () => {
    expect(() => requireLocalMediaProvider("S3")).toThrow("S3 objects were not listed");
    expect(() => requireLocalMediaProvider("LOCAL")).not.toThrow();
  });

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
    expect(report.invalidFilename).toEqual({ count: 2, recordCount: 1, localFileCount: 1 });
    expect(Object.values(report.samples).every((sample) => sample.length <= 1)).toBe(true);
    expect(records.map((record) => record.objectKey)).toEqual([png, jpg, webp, "unsafe.png"]);
    expect(files).toEqual([jpg, png, `${"d".repeat(64)}.webp`, "notes.txt"]);
  });

  it("deduplicates filenames returned by a storage listing", () => {
    const report = reconcileLocalMedia([], [jpg, jpg, "bad", "bad"]);

    expect(report.localFiles).toBe(2);
    expect(report.orphan.count).toBe(1);
    expect(report.invalidFilename.localFileCount).toBe(1);
  });

  it("rejects invalid sample limits", () => {
    expect(() => reconcileLocalMedia([], [], -1)).toThrow("sampleLimit");
    expect(() => reconcileLocalMedia([], [], 1.5)).toThrow("sampleLimit");
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
