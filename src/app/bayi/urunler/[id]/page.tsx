import { notFound } from "next/navigation";

import { requireDealerContext } from "@/data/dealer-context";
import { getProductDetail } from "@/data/product-detail";
import { ProductDetail } from "@/features/commerce/product-detail";

export const dynamic = "force-dynamic";

export default async function DealerProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company, user } = await requireDealerContext(`/bayi/urunler/${id}`);
  const viewer = {
    role: user.role as "DEALER_OWNER" | "DEALER_STAFF",
    companyId: company.id,
    customerGroupId: company.customerGroup?.id,
  };
  const product = await getProductDetail(id, viewer);

  if (!product) notFound();

  return <ProductDetail embedded product={product} viewer={viewer} basePath="/bayi/urunler" />;
}
