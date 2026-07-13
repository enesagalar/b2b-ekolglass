import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCommerceIdentity } from "@/data/commerce";
import { getProductDetail } from "@/data/product-detail";
import type { CatalogViewer } from "@/domain/catalog";
import { isDealerRole, isKnownRole } from "@/domain/roles";
import { CommerceFooter, CommerceHeader } from "@/features/commerce/commerce-header";
import { ProductDetail } from "@/features/commerce/product-detail";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Ürün detayı",
  description: "EkolGlass ürün teknik özelliklerini, uyumluluk ve stok bilgisini inceleyin.",
};
export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, identity, user] = await Promise.all([params, getCommerceIdentity(), getCurrentUser()]);
  const dealerUser = user && isKnownRole(user.role) && isDealerRole(user.role) && user.companyId ? user : null;
  const company = dealerUser
    ? await prisma.company.findUnique({
        where: { id: dealerUser.companyId! },
        select: { status: true, customerGroupId: true, discountRate: true },
      })
    : null;
  const viewer: CatalogViewer = dealerUser && company?.status === "APPROVED"
    ? { role: dealerUser.role as "DEALER_OWNER" | "DEALER_STAFF", companyId: dealerUser.companyId, customerGroupId: company.customerGroupId, discountRate: company.discountRate?.toString() ?? "0" }
    : { role: "GUEST" };
  const product = await getProductDetail(id, viewer);

  if (!product) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <CommerceHeader identity={identity} />
      <ProductDetail product={product} viewer={viewer} basePath="/urunler" adminView={identity?.audience === "admin"} />
      <CommerceFooter identity={identity} />
    </main>
  );
}
