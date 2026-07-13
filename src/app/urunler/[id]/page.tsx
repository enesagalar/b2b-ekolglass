import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCommerceIdentity } from "@/data/commerce";
import { getProductDetail } from "@/data/product-detail";
import type { CatalogViewer } from "@/domain/catalog";
import { isKnownRole } from "@/domain/roles";
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
  const company = user?.companyId
    ? await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { status: true, customerGroupId: true },
      })
    : null;
  const viewer: CatalogViewer = {
    role: isKnownRole(user?.role) ? user.role : "GUEST",
    companyId: company?.status === "APPROVED" ? user?.companyId ?? undefined : undefined,
    customerGroupId: company?.status === "APPROVED" ? company.customerGroupId ?? undefined : undefined,
  };
  const product = await getProductDetail(id, viewer);

  if (!product) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <CommerceHeader identity={identity} />
      <ProductDetail product={product} viewer={viewer} basePath="/urunler" />
      <CommerceFooter identity={identity} />
    </main>
  );
}
