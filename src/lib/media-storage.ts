import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const mediaTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type MediaStorageProvider = "LOCAL" | "S3";
export type StorageEnvironment = Record<string, string | undefined>;

export type MediaStorageConfig =
  | { provider: "LOCAL" }
  | {
      provider: "S3";
      bucket: string;
      region: string;
      endpoint?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      forcePathStyle: boolean;
      prefix: string;
      readinessTimeoutMs: number;
    };

export const maxImageUploadBytes = 5 * 1024 * 1024;
export const mediaObjectKeyPattern = /^(?:[a-f0-9]{64}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[a-f0-9]{64})\.(?:jpg|png|webp)$/;

export function detectImageMime(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg" as const;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png" as const;
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp" as const;
  return null;
}

function required(env: StorageEnvironment, key: string) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} depolama ayarı zorunludur.`);
  return value;
}

function normalizePrefix(value: string | undefined) {
  const prefix = value?.trim().replace(/^\/+|\/+$/g, "") ?? "media";
  if (!prefix || !/^[a-zA-Z0-9/_-]+$/.test(prefix)) throw new Error("MEDIA_S3_PREFIX geçersizdir.");
  return prefix;
}

function readinessTimeout(value: string | undefined) {
  if (!value?.trim()) return 5_000;
  const timeoutMs = Number(value);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 30_000) {
    throw new Error("MEDIA_STORAGE_READINESS_TIMEOUT_MS 1000 ile 30000 arasinda bir tam sayi olmalidir.");
  }
  return timeoutMs;
}

export function resolveMediaStorageConfig(env: StorageEnvironment = process.env): MediaStorageConfig {
  const configured = env.MEDIA_STORAGE_PROVIDER?.trim().toLocaleUpperCase("en-US");
  const provider = (configured || (env.NODE_ENV === "production" ? "" : "LOCAL")) as MediaStorageProvider | "";
  if (!provider) throw new Error("Production ortamında MEDIA_STORAGE_PROVIDER açıkça tanımlanmalıdır.");
  if (provider === "LOCAL") {
    return { provider };
  }
  if (provider !== "S3") throw new Error("MEDIA_STORAGE_PROVIDER yalnızca LOCAL veya S3 olabilir.");
  const accessKeyId = env.MEDIA_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.MEDIA_S3_SECRET_ACCESS_KEY?.trim();
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) throw new Error("S3 access key ve secret key birlikte tanımlanmalıdır.");
  return {
    provider,
    bucket: required(env, "MEDIA_S3_BUCKET"),
    region: required(env, "MEDIA_S3_REGION"),
    endpoint: env.MEDIA_S3_ENDPOINT?.trim() || undefined,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: env.MEDIA_S3_FORCE_PATH_STYLE?.trim().toLocaleLowerCase("en-US") === "true",
    prefix: normalizePrefix(env.MEDIA_S3_PREFIX),
    readinessTimeoutMs: readinessTimeout(env.MEDIA_STORAGE_READINESS_TIMEOUT_MS),
  };
}

function objectPath(prefix: string, objectKey: string) {
  return `${prefix}/${objectKey}`;
}

function localStorageRoot() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "media");
}

function localObjectPath(objectKey: string) {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "media", objectKey);
}

export function createS3Client(config: Extract<MediaStorageConfig, { provider: "S3" }>) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: config.accessKeyId && config.secretAccessKey ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } : undefined,
  });
}

type ReadinessDependencies = {
  probeLocalStorage?: (root: string) => Promise<unknown>;
  headBucket?: (
    client: S3Client,
    bucket: string,
    abortSignal: AbortSignal,
  ) => Promise<unknown>;
};

export async function checkMediaStorageReadiness(
  env: StorageEnvironment = process.env,
  dependencies: ReadinessDependencies = {},
) {
  let config: MediaStorageConfig;
  try {
    config = resolveMediaStorageConfig(env);
  } catch {
    return { status: "degraded" as const, provider: "MISCONFIGURED" as const, reason: "configuration" as const };
  }

  if (config.provider === "LOCAL") {
    const probeLocalStorage = dependencies.probeLocalStorage ?? (async (root: string) => {
      await mkdir(root, { recursive: true });
      await access(root, constants.R_OK | constants.W_OK);
    });
    try {
      await probeLocalStorage(localStorageRoot());
      return { status: "ok" as const, provider: config.provider };
    } catch {
      return { status: "degraded" as const, provider: config.provider, reason: "unreachable" as const };
    }
  }

  const headBucket = dependencies.headBucket ?? ((client, bucket, abortSignal) => (
    client.send(new HeadBucketCommand({ Bucket: bucket }), { abortSignal })
  ));
  try {
    await headBucket(createS3Client(config), config.bucket, AbortSignal.timeout(config.readinessTimeoutMs));
    return { status: "ok" as const, provider: config.provider };
  } catch {
    return { status: "degraded" as const, provider: config.provider, reason: "unreachable" as const };
  }
}

export function getMediaStorageHealth(env: StorageEnvironment = process.env) {
  try {
    const config = resolveMediaStorageConfig(env);
    return { status: "ok" as const, provider: config.provider };
  } catch {
    return { status: "degraded" as const, provider: "MISCONFIGURED" as const };
  }
}

export async function storeImage(buffer: Buffer) {
  const mimeType = detectImageMime(buffer);
  if (!mimeType) throw new Error("Yalnız JPEG, PNG veya WebP görsel yüklenebilir.");
  if (!buffer.length || buffer.length > maxImageUploadBytes) throw new Error("Görsel 5 MB sınırını aşamaz.");
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const objectKey = `${randomUUID()}-${checksum}.${mediaTypes[mimeType]}`;
  const config = resolveMediaStorageConfig();
  if (config.provider === "LOCAL") {
    await mkdir(localStorageRoot(), { recursive: true });
    await writeFile(localObjectPath(objectKey), buffer, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
    });
  } else {
    await createS3Client(config).send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectPath(config.prefix, objectKey),
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: { checksum },
    }));
  }
  return { objectKey, mimeType, checksum, byteSize: buffer.length, storageProvider: config.provider, url: `/media/${objectKey}` };
}

export async function readStoredImage(objectKey: string, provider?: string | null) {
  if (!mediaObjectKeyPattern.test(objectKey)) return null;
  const config = resolveMediaStorageConfig();
  if (provider && provider !== config.provider) return null;
  if (config.provider === "LOCAL") return readFile(localObjectPath(objectKey)).catch(() => null);
  try {
    const response = await createS3Client(config).send(new GetObjectCommand({ Bucket: config.bucket, Key: objectPath(config.prefix, objectKey) }));
    if (!response.Body) return null;
    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    const status = typeof error === "object" && error && "$metadata" in error ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode : undefined;
    if (status === 404) return null;
    throw error;
  }
}

export async function deleteStoredImage(objectKey: string, provider?: string | null) {
  if (!mediaObjectKeyPattern.test(objectKey)) return false;
  const config = resolveMediaStorageConfig();
  if (provider && provider !== config.provider) return false;
  if (config.provider === "LOCAL") {
    await unlink(localObjectPath(objectKey)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return true;
  }
  await createS3Client(config).send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: objectPath(config.prefix, objectKey),
  }));
  return true;
}
