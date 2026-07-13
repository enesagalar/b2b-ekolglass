import { permanentRedirect } from "next/navigation";

export default async function LegacyDealerProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/urunler/${id}`);
}
