import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const mediaTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type MediaStorageProvider = "LOCAL" | "S3";
type StorageEnvironment = Record<string, string | undefined>;

type MediaStorageConfig =
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
    };

export const maxImageUploadBytes = 5 * 1024 * 1024;

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

function createS3Client(config: Extract<MediaStorageConfig, { provider: "S3" }>) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: config.accessKeyId && config.secretAccessKey ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } : undefined,
  });
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
  const objectKey = `${checksum}.${mediaTypes[mimeType]}`;
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
  if (!/^[a-f0-9]{64}\.(?:jpg|png|webp)$/.test(objectKey)) return null;
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
