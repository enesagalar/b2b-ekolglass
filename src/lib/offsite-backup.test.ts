import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveOffsiteBackupConfig, uploadVerifiedBackup, type OffsiteBackupClient } from "./offsite-backup";

const tempRoots: string[] = [];
const baseEnv = {
  BACKUP_OFFSITE_PROVIDER: "S3",
  BACKUP_S3_BUCKET: "ekolglass-backups",
  BACKUP_S3_REGION: "auto",
  BACKUP_S3_UPLOAD_TIMEOUT_MS: "45000",
};

async function backupFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ekolglass-offsite-test-"));
  tempRoots.push(root);
  const databasePath = path.join(root, "ekolglass-test.sqlite");
  const manifestPath = path.join(root, "ekolglass-test.manifest.json");
  const database = Buffer.from("verified sqlite backup");
  const databaseSha256 = createHash("sha256").update(database).digest("hex");
  const manifest = {
    version: 1,
    createdAt: "2026-07-20T12:00:00.000Z",
    databaseFile: path.basename(databasePath),
    byteSize: database.length,
    sha256: databaseSha256,
  };
  await writeFile(databasePath, database);
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  return { root, databasePath, manifestPath, database, databaseSha256 };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("offsite backup configuration", () => {
  it("fails closed unless the provider is explicitly valid", () => {
    expect(() => resolveOffsiteBackupConfig({})).toThrow("BACKUP_OFFSITE_PROVIDER");
    expect(() => resolveOffsiteBackupConfig({ BACKUP_OFFSITE_PROVIDER: "local" })).toThrow("DISABLED veya S3");
    expect(resolveOffsiteBackupConfig({ BACKUP_OFFSITE_PROVIDER: "disabled" })).toEqual({ provider: "DISABLED" });
    expect(() => resolveOffsiteBackupConfig({ BACKUP_OFFSITE_PROVIDER: "S3" })).toThrow("BACKUP_S3_BUCKET");
    expect(() => resolveOffsiteBackupConfig({ ...baseEnv, BACKUP_S3_FORCE_PATH_STYLE: "yes" })).toThrow("true veya false");
  });

  it("normalizes a safe prefix and rejects traversal or empty segments", () => {
    expect(resolveOffsiteBackupConfig({ ...baseEnv, BACKUP_S3_PREFIX: "/portal/database/" })).toMatchObject({ prefix: "portal/database" });
    expect(resolveOffsiteBackupConfig(baseEnv)).toMatchObject({ prefix: "database-backups" });
    expect(() => resolveOffsiteBackupConfig({ ...baseEnv, BACKUP_S3_PREFIX: "portal/../database" })).toThrow("güvenli");
    expect(() => resolveOffsiteBackupConfig({ ...baseEnv, BACKUP_S3_PREFIX: "portal//database" })).toThrow("güvenli");
    expect(() => resolveOffsiteBackupConfig({ ...baseEnv, BACKUP_S3_PREFIX: "portal\\database" })).toThrow("güvenli");
  });

  it("requires optional static credentials as a pair", () => {
    expect(() => resolveOffsiteBackupConfig({ ...baseEnv, BACKUP_S3_ACCESS_KEY_ID: "access" })).toThrow("birlikte");
    expect(() => resolveOffsiteBackupConfig({ ...baseEnv, BACKUP_S3_SECRET_ACCESS_KEY: "secret" })).toThrow("birlikte");
    expect(resolveOffsiteBackupConfig({
      ...baseEnv,
      BACKUP_S3_ACCESS_KEY_ID: "access",
      BACKUP_S3_SECRET_ACCESS_KEY: "secret",
    })).toMatchObject({ accessKeyId: "access", secretAccessKey: "secret" });
  });

  it("requires a key id for KMS encryption", () => {
    expect(() => resolveOffsiteBackupConfig({ ...baseEnv, BACKUP_S3_SERVER_SIDE_ENCRYPTION: "aws:kms" })).toThrow("BACKUP_S3_KMS_KEY_ID");
    expect(resolveOffsiteBackupConfig({
      ...baseEnv,
      BACKUP_S3_SERVER_SIDE_ENCRYPTION: "aws:kms",
      BACKUP_S3_KMS_KEY_ID: "alias/ekolglass-backups",
    })).toMatchObject({ encryption: { algorithm: "aws:kms", keyId: "alias/ekolglass-backups" } });
    expect(() => resolveOffsiteBackupConfig({ ...baseEnv, BACKUP_S3_SERVER_SIDE_ENCRYPTION: "none" })).toThrow("AES256 veya aws:kms");
  });

  it("bounds the upload timeout", () => {
    expect(resolveOffsiteBackupConfig(baseEnv)).toMatchObject({ uploadTimeoutMs: 45_000 });
    expect(() => resolveOffsiteBackupConfig({ ...baseEnv, BACKUP_S3_UPLOAD_TIMEOUT_MS: "999" })).toThrow("BACKUP_S3_UPLOAD_TIMEOUT_MS");
  });
});

describe("offsite backup upload", () => {
  it("uploads the database first and publishes the manifest last with private verified metadata", async () => {
    const fixture = await backupFixture();
    const sent: PutObjectCommand[] = [];
    const checkpoint = vi.fn(async () => undefined);
    const client: OffsiteBackupClient = { send: vi.fn(async (command) => { sent.push(command); }) };

    const result = await uploadVerifiedBackup({
      databasePath: fixture.databasePath,
      manifestPath: fixture.manifestPath,
      env: { ...baseEnv, BACKUP_S3_PREFIX: "/portal/backups/" },
      client,
      checkpoint,
    });

    expect(sent).toHaveLength(2);
    expect(checkpoint).toHaveBeenCalledOnce();
    expect(client.send).toHaveBeenCalledTimes(2);
    for (const [, options] of vi.mocked(client.send).mock.calls) {
      expect(options?.abortSignal).toBeInstanceOf(AbortSignal);
    }
    const databaseUpload = sent[0].input;
    const manifestUpload = sent[1].input;
    expect(databaseUpload.Key).toBe(`portal/backups/${fixture.databaseSha256}/ekolglass-test.sqlite`);
    expect(manifestUpload.Key).toBe(`portal/backups/${fixture.databaseSha256}/ekolglass-test.manifest.json`);
    for (const upload of [databaseUpload, manifestUpload]) {
      expect(upload).toMatchObject({
        Bucket: "ekolglass-backups",
        CacheControl: "no-store",
        ChecksumAlgorithm: "SHA256",
        ServerSideEncryption: "AES256",
      });
      expect(upload.Metadata?.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(upload.ChecksumSHA256).toBe(Buffer.from(upload.Metadata!.sha256, "hex").toString("base64"));
    }
    expect(result).toMatchObject({ status: "uploaded", provider: "S3", database: { sha256: fixture.databaseSha256 } });
    expect(result).not.toHaveProperty("bucket");
    expect(result).not.toHaveProperty("databasePath");
    expect(result).not.toHaveProperty("manifestPath");
    expect(JSON.stringify(result)).not.toContain(fixture.root);
  });

  it("does not upload when the manifest does not verify the database", async () => {
    const fixture = await backupFixture();
    await writeFile(fixture.databasePath, Buffer.from("tampered backup"));
    const client: OffsiteBackupClient = { send: vi.fn() };
    await expect(uploadVerifiedBackup({
      databasePath: fixture.databasePath,
      manifestPath: fixture.manifestPath,
      env: baseEnv,
      client,
    })).rejects.toThrow("manifest doğrulaması");
    expect(client.send).not.toHaveBeenCalled();
  });

  it("returns a path-free no-op result when offsite backup is disabled", async () => {
    const result = await uploadVerifiedBackup({
      databasePath: "C:\\secret\\database.sqlite",
      manifestPath: "C:\\secret\\database.manifest.json",
      env: { BACKUP_OFFSITE_PROVIDER: "DISABLED" },
    });
    expect(result).toEqual({ status: "disabled", provider: "DISABLED" });
  });
});
