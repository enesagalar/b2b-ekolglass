import { permanentRedirect } from "next/navigation";

export default async function LegacyDealerProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) query.set(key, value);
  }
  permanentRedirect(`/urunler${query.size ? `?${query.toString()}` : ""}`);
}
