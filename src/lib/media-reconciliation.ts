import { readdir } from "node:fs/promises";
import path from "node:path";

export const mediaObjectKeyPattern = /^[a-f0-9]{64}\.(?:jpg|png|webp)$/;

export type MediaAssetReference = {
  objectKey: string;
  isActive: boolean;
};

type StatusCounts = {
  total: number;
  active: number;
  inactive: number;
};

type RecordSample = {
  objectKey: string;
  status: "active" | "inactive";
};

export type MediaReconciliationReport = {
  provider: "LOCAL";
  sampleLimit: number;
  records: StatusCounts;
  localFiles: number;
  referenced: StatusCounts;
  missing: StatusCounts;
  orphan: { count: number };
  invalidFilename: {
    count: number;
    recordCount: number;
    localFileCount: number;
  };
  samples: {
    referenced: RecordSample[];
    missing: RecordSample[];
    orphan: string[];
    invalidRecordObjectKey: RecordSample[];
    invalidLocalFilename: string[];
  };
};

export function requireLocalMediaProvider(provider: string): asserts provider is "LOCAL" {
  if (provider !== "LOCAL") {
    throw new Error("Media reconciliation supports LOCAL storage only; S3 objects were not listed.");
  }
}

function emptyStatusCounts(): StatusCounts {
  return { total: 0, active: 0, inactive: 0 };
}

function addStatus(counts: StatusCounts, isActive: boolean) {
  counts.total += 1;
  counts[isActive ? "active" : "inactive"] += 1;
}

function recordSample(record: MediaAssetReference): RecordSample {
  return { objectKey: record.objectKey, status: record.isActive ? "active" : "inactive" };
}

function bounded<T>(values: T[], sampleLimit: number) {
  return values.slice(0, sampleLimit);
}

export function reconcileLocalMedia(
  records: MediaAssetReference[],
  localFilenames: string[],
  sampleLimit = 20,
): MediaReconciliationReport {
  if (!Number.isSafeInteger(sampleLimit) || sampleLimit < 0) {
    throw new Error("sampleLimit must be a non-negative safe integer.");
  }

  const sortedRecords = [...records].sort((left, right) => left.objectKey.localeCompare(right.objectKey));
  const sortedFilenames = [...new Set(localFilenames)].sort((left, right) => left.localeCompare(right));
  const validLocalFiles = new Set(sortedFilenames.filter((filename) => mediaObjectKeyPattern.test(filename)));
  const validRecordKeys = new Set(sortedRecords.filter((record) => mediaObjectKeyPattern.test(record.objectKey)).map((record) => record.objectKey));
  const report: MediaReconciliationReport = {
    provider: "LOCAL",
    sampleLimit,
    records: emptyStatusCounts(),
    localFiles: sortedFilenames.length,
    referenced: emptyStatusCounts(),
    missing: emptyStatusCounts(),
    orphan: { count: 0 },
    invalidFilename: { count: 0, recordCount: 0, localFileCount: 0 },
    samples: {
      referenced: [],
      missing: [],
      orphan: [],
      invalidRecordObjectKey: [],
      invalidLocalFilename: [],
    },
  };

  const referenced: RecordSample[] = [];
  const missing: RecordSample[] = [];
  const invalidRecords: RecordSample[] = [];
  for (const record of sortedRecords) {
    addStatus(report.records, record.isActive);
    if (!mediaObjectKeyPattern.test(record.objectKey)) {
      report.invalidFilename.recordCount += 1;
      invalidRecords.push(recordSample(record));
    } else if (validLocalFiles.has(record.objectKey)) {
      addStatus(report.referenced, record.isActive);
      referenced.push(recordSample(record));
    } else {
      addStatus(report.missing, record.isActive);
      missing.push(recordSample(record));
    }
  }

  const orphan = sortedFilenames.filter((filename) => mediaObjectKeyPattern.test(filename) && !validRecordKeys.has(filename));
  const invalidLocal = sortedFilenames.filter((filename) => !mediaObjectKeyPattern.test(filename));
  report.orphan.count = orphan.length;
  report.invalidFilename.localFileCount = invalidLocal.length;
  report.invalidFilename.count = report.invalidFilename.recordCount + report.invalidFilename.localFileCount;
  report.samples = {
    referenced: bounded(referenced, sampleLimit),
    missing: bounded(missing, sampleLimit),
    orphan: bounded(orphan, sampleLimit),
    invalidRecordObjectKey: bounded(invalidRecords, sampleLimit),
    invalidLocalFilename: bounded(invalidLocal, sampleLimit),
  };
  return report;
}

export async function listLocalMediaFiles(storageRoot = path.join(process.cwd(), "storage", "media")) {
  try {
    const entries = await readdir(storageRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
