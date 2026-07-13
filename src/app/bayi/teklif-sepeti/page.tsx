import { permanentRedirect } from "next/navigation";

export default async function LegacyQuoteCartPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const { added } = await searchParams;
  permanentRedirect(`/teklif-sepeti${added === "1" ? "?added=1" : ""}`);
}
