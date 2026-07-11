import { permanentRedirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LegacyCatalogRedirect({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(resolved)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) params.set(key, value);
  }
  permanentRedirect(`/urunler${params.size ? `?${params.toString()}` : ""}`);
}
