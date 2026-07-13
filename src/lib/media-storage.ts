import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const mediaTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const maxImageUploadBytes = 5 * 1024 * 1024;

export function detectImageMime(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg" as const;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png" as const;
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp" as const;
  return null;
}

function storageRoot() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "media");
}

export async function storeImage(buffer: Buffer) {
  const mimeType = detectImageMime(buffer);
  if (!mimeType) throw new Error("Yalniz JPEG, PNG veya WebP gorsel yuklenebilir.");
  if (!buffer.length || buffer.length > maxImageUploadBytes) throw new Error("Gorsel 5 MB sinirini asamaz.");
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const objectKey = `${checksum}.${mediaTypes[mimeType]}`;
  await mkdir(storageRoot(), { recursive: true });
  await writeFile(path.join(storageRoot(), objectKey), buffer, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
  });
  return { objectKey, mimeType, checksum, byteSize: buffer.length, url: `/media/${objectKey}` };
}

export async function readStoredImage(objectKey: string) {
  if (!/^[a-f0-9]{64}\.(?:jpg|png|webp)$/.test(objectKey)) return null;
  return readFile(path.join(storageRoot(), objectKey)).catch(() => null);
}
