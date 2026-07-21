import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client, type PutObjectCommandInput } from "@aws-sdk/client-s3";

import type { SqliteBackupManifest } from "./sqlite-backup";

type BackupEnvironment = Record<string, string | undefined>;
type ServerSideEncryption =
  | { algorithm: "AES256" }
  | { algorithm: "aws:kms"; keyId: string };

export type OffsiteBackupConfig =
  | { provider: "DISABLED" }
  | {
      provider: "S3";
      bucket: string;
      region: string;
      endpoint?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      forcePathStyle: boolean;
      prefix: string;
      encryption: ServerSideEncryption;
      uploadTimeoutMs: number;
    };

export type OffsiteBackupClient = {
  send(command: PutObjectCommand, options?: { abortSignal?: AbortSignal }): Promise<unknown>;
};

function required(env: BackupEnvironment, key: string) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} offsite backup ayarı zorunludur.`);
  return value;
}

function booleanValue(env: BackupEnvironment, key: string, fallback: boolean) {
  const value = env[key]?.trim().toLocaleLowerCase("en-US");
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${key} yalnızca true veya false olabilir.`);
}

function uploadTimeout(value: string | undefined) {
  if (!value?.trim()) return 120_000;
  const timeoutMs = Number(value);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 900_000) {
    throw new Error("BACKUP_S3_UPLOAD_TIMEOUT_MS 1000 ile 900000 arasinda bir tam sayi olmalidir.");
  }
  return timeoutMs;
}

function normalizePrefix(value: string | undefined) {
  const prefix = value?.trim().replace(/^\/+|\/+$/g, "") || "database-backups";
  const segments = prefix.split("/");
  if (
    prefix.includes("\\")
    || segments.some((segment) => !segment || segment === "." || segment === ".." || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(segment))
  ) {
    throw new Error("BACKUP_S3_PREFIX güvenli bir nesne öneki olmalıdır.");
  }
  return segments.join("/");
}

function resolveEncryption(env: BackupEnvironment): ServerSideEncryption {
  const algorithm = env.BACKUP_S3_SERVER_SIDE_ENCRYPTION?.trim() || "AES256";
  if (algorithm === "AES256") return { algorithm };
  if (algorithm !== "aws:kms") throw new Error("BACKUP_S3_SERVER_SIDE_ENCRYPTION yalnızca AES256 veya aws:kms olabilir.");
  return { algorithm, keyId: required(env, "BACKUP_S3_KMS_KEY_ID") };
}

export function resolveOffsiteBackupConfig(env: BackupEnvironment = process.env): OffsiteBackupConfig {
  const provider = env.BACKUP_OFFSITE_PROVIDER?.trim().toLocaleUpperCase("en-US");
  if (!provider) throw new Error("BACKUP_OFFSITE_PROVIDER açıkça DISABLED veya S3 olarak tanımlanmalıdır.");
  if (provider === "DISABLED") return { provider };
  if (provider !== "S3") throw new Error("BACKUP_OFFSITE_PROVIDER yalnızca DISABLED veya S3 olabilir.");

  const accessKeyId = env.BACKUP_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.BACKUP_S3_SECRET_ACCESS_KEY?.trim();
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error("BACKUP_S3_ACCESS_KEY_ID ve BACKUP_S3_SECRET_ACCESS_KEY birlikte tanımlanmalıdır.");
  }

  return {
    provider,
    bucket: required(env, "BACKUP_S3_BUCKET"),
    region: required(env, "BACKUP_S3_REGION"),
    endpoint: env.BACKUP_S3_ENDPOINT?.trim() || undefined,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: booleanValue(env, "BACKUP_S3_FORCE_PATH_STYLE", false),
    prefix: normalizePrefix(env.BACKUP_S3_PREFIX),
    encryption: resolveEncryption(env),
    uploadTimeoutMs: uploadTimeout(env.BACKUP_S3_UPLOAD_TIMEOUT_MS),
  };
}

function createClient(config: Extract<OffsiteBackupConfig, { provider: "S3" }>) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: config.accessKeyId && config.secretAccessKey
      ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
      : undefined,
  });
}

function sha256(buffer: Buffer) {
  const hex = createHash("sha256").update(buffer).digest("hex");
  const base64 = createHash("sha256").update(buffer).digest("base64");
  return { hex, base64 };
}

function objectKey(prefix: string, databaseChecksum: string, fileName: string) {
  return `${prefix}/${databaseChecksum}/${fileName}`;
}

function encryptionInput(encryption: ServerSideEncryption): Pick<PutObjectCommandInput, "ServerSideEncryption" | "SSEKMSKeyId"> {
  return encryption.algorithm === "aws:kms"
    ? { ServerSideEncryption: encryption.algorithm, SSEKMSKeyId: encryption.keyId }
    : { ServerSideEncryption: encryption.algorithm };
}

function uploadInput(options: {
  config: Extract<OffsiteBackupConfig, { provider: "S3" }>;
  key: string;
  body: Buffer;
  contentType: string;
  checksum: { hex: string; base64: string };
}): PutObjectCommandInput {
  return {
    Bucket: options.config.bucket,
    Key: options.key,
    Body: options.body,
    CacheControl: "no-store",
    ContentType: options.contentType,
    ChecksumAlgorithm: "SHA256",
    ChecksumSHA256: options.checksum.base64,
    Metadata: { sha256: options.checksum.hex },
    ...encryptionInput(options.config.encryption),
  };
}

export async function uploadVerifiedBackup(options: {
  databasePath: string;
  manifestPath: string;
  env?: BackupEnvironment;
  client?: OffsiteBackupClient;
  checkpoint?: () => Promise<void>;
}) {
  const config = resolveOffsiteBackupConfig(options.env);
  if (config.provider === "DISABLED") return { status: "disabled" as const, provider: config.provider };

  const [database, manifestBuffer] = await Promise.all([
    readFile(/* turbopackIgnore: true */ options.databasePath),
    readFile(/* turbopackIgnore: true */ options.manifestPath),
  ]);
  const manifest = JSON.parse(manifestBuffer.toString("utf8")) as SqliteBackupManifest;
  const databaseFile = path.basename(options.databasePath);
  const manifestFile = path.basename(options.manifestPath);
  const databaseChecksum = sha256(database);
  const manifestChecksum = sha256(manifestBuffer);

  if (manifest.databaseFile !== databaseFile || manifest.byteSize !== database.length || manifest.sha256 !== databaseChecksum.hex) {
    throw new Error("Offsite backup yüklemesi öncesi manifest doğrulaması başarısız.");
  }

  const client = options.client ?? createClient(config);
  await client.send(new PutObjectCommand(uploadInput({
    config,
    key: objectKey(config.prefix, databaseChecksum.hex, databaseFile),
    body: database,
    contentType: "application/vnd.sqlite3",
    checksum: databaseChecksum,
  })), { abortSignal: AbortSignal.timeout(config.uploadTimeoutMs) });
  await options.checkpoint?.();
  await client.send(new PutObjectCommand(uploadInput({
    config,
    key: objectKey(config.prefix, databaseChecksum.hex, manifestFile),
    body: manifestBuffer,
    contentType: "application/json",
    checksum: manifestChecksum,
  })), { abortSignal: AbortSignal.timeout(config.uploadTimeoutMs) });

  return {
    status: "uploaded" as const,
    provider: config.provider,
    database: { byteSize: database.length, sha256: databaseChecksum.hex },
    manifest: { byteSize: manifestBuffer.length, sha256: manifestChecksum.hex },
  };
}
