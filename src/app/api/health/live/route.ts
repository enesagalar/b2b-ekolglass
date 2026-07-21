import { getPublicReleaseMetadata } from "@/lib/release-metadata";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { status: "ok", release: getPublicReleaseMetadata(), timestamp: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}
