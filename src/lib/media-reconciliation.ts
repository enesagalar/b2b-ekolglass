import { readdir } from "node:fs/promises";
import path from "node:path";

import { ListObjectsV2Command, type ListObjectsV2CommandOutput, type S3Client } from "@aws-sdk/client-s3";

import { createS3Client, type MediaStorageConfig } from "./media-storage";

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
  provider: "LOCAL" | "S3";
  sampleLimit: number;
  records: StatusCounts;
  storageObjects: number;
  referenced: StatusCounts;
  missing: StatusCounts;
  orphan: { count: number };
  invalidFilename: {
    count: number;
    recordCount: number;
    storedObjectCount: number;
  };
  samples: {
    referenced: RecordSample[];
    missing: RecordSample[];
    orphan: string[];
    invalidRecordObjectKey: RecordSample[];
    invalidStoredObjectKey: string[];
  };
};

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

export function reconcileMedia(
  records: MediaAssetReference[],
  storedObjectKeys: string[],
  provider: "LOCAL" | "S3",
  sampleLimit = 20,
): MediaReconciliationReport {
  if (!Number.isSafeInteger(sampleLimit) || sampleLimit < 0) {
    throw new Error("sampleLimit must be a non-negative safe integer.");
  }

  const sortedRecords = [...records].sort((left, right) => left.objectKey.localeCompare(right.objectKey));
  const sortedObjectKeys = [...new Set(storedObjectKeys)].sort((left, right) => left.localeCompare(right));
  const validStoredObjects = new Set(sortedObjectKeys.filter((objectKey) => mediaObjectKeyPattern.test(objectKey)));
  const validRecordKeys = new Set(sortedRecords.filter((record) => mediaObjectKeyPattern.test(record.objectKey)).map((record) => record.objectKey));
  const report: MediaReconciliationReport = {
    provider,
    sampleLimit,
    records: emptyStatusCounts(),
    storageObjects: sortedObjectKeys.length,
    referenced: emptyStatusCounts(),
    missing: emptyStatusCounts(),
    orphan: { count: 0 },
    invalidFilename: { count: 0, recordCount: 0, storedObjectCount: 0 },
    samples: {
      referenced: [],
      missing: [],
      orphan: [],
      invalidRecordObjectKey: [],
      invalidStoredObjectKey: [],
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
    } else if (validStoredObjects.has(record.objectKey)) {
      addStatus(report.referenced, record.isActive);
      referenced.push(recordSample(record));
    } else {
      addStatus(report.missing, record.isActive);
      missing.push(recordSample(record));
    }
  }

  const orphan = sortedObjectKeys.filter((objectKey) => mediaObjectKeyPattern.test(objectKey) && !validRecordKeys.has(objectKey));
  const invalidStored = sortedObjectKeys.filter((objectKey) => !mediaObjectKeyPattern.test(objectKey));
  report.orphan.count = orphan.length;
  report.invalidFilename.storedObjectCount = invalidStored.length;
  report.invalidFilename.count = report.invalidFilename.recordCount + report.invalidFilename.storedObjectCount;
  report.samples = {
    referenced: bounded(referenced, sampleLimit),
    missing: bounded(missing, sampleLimit),
    orphan: bounded(orphan, sampleLimit),
    invalidRecordObjectKey: bounded(invalidRecords, sampleLimit),
    invalidStoredObjectKey: bounded(invalidStored, sampleLimit),
  };
  return report;
}

export function reconcileLocalMedia(records: MediaAssetReference[], localFilenames: string[], sampleLimit = 20) {
  return reconcileMedia(records, localFilenames, "LOCAL", sampleLimit);
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

type S3ListingDependencies = {
  listObjects?: (
    client: S3Client,
    input: { Bucket: string; Prefix: string; ContinuationToken?: string },
  ) => Promise<ListObjectsV2CommandOutput>;
};

export async function listS3MediaObjects(
  config: Extract<MediaStorageConfig, { provider: "S3" }>,
  maxObjects = 100_000,
  dependencies: S3ListingDependencies = {},
) {
  if (!Number.isSafeInteger(maxObjects) || maxObjects < 1 || maxObjects > 1_000_000) {
    throw new Error("maxObjects must be an integer between 1 and 1000000.");
  }
  const listObjects = dependencies.listObjects ?? ((client, input) => client.send(new ListObjectsV2Command(input)));
  const client = createS3Client(config);
  const prefix = `${config.prefix}/`;
  const objectKeys: string[] = [];
  const seenTokens = new Set<string>();
  let continuationToken: string | undefined;

  do {
    const page = await listObjects(client, { Bucket: config.bucket, Prefix: prefix, ContinuationToken: continuationToken });
    for (const object of page.Contents ?? []) {
      if (!object.Key?.startsWith(prefix)) continue;
      objectKeys.push(object.Key.slice(prefix.length));
      if (objectKeys.length > maxObjects) {
        throw new Error(`S3 media listing exceeded the ${maxObjects} object safety limit.`);
      }
    }
    if (!page.IsTruncated) break;
    const nextToken = page.NextContinuationToken;
    if (!nextToken || seenTokens.has(nextToken)) throw new Error("S3 media listing returned an invalid continuation token.");
    seenTokens.add(nextToken);
    continuationToken = nextToken;
  } while (true);

  return objectKeys;
}
