import { readStoredImage } from "@/lib/media-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const asset = await prisma.mediaAsset.findFirst({
    where: { objectKey: file, isActive: true },
    select: { mimeType: true },
  });
  if (!asset?.mimeType) return new Response("Not found", { status: 404 });
  const buffer = await readStoredImage(file);
  if (!buffer) return new Response("Not found", { status: 404 });
  return new Response(buffer, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
