import type { Metadata } from "next";

import { getCommerceIdentity } from "@/data/commerce";
import { isKnownRole } from "@/domain/roles";
import type { CatalogViewer } from "@/domain/catalog";
import { CommerceFooter, CommerceHeader } from "@/features/commerce/commerce-header";
import { ProductBrowser } from "@/features/commerce/product-browser";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ürünler", description: "EkolGlass otomotiv ve özel üretim cam ürünlerini arayın." };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const [identity, user, resolved] = await Promise.all([getCommerceIdentity(), getCurrentUser(), searchParams]);
  const company = user?.companyId ? await prisma.company.findUnique({ where: { id: user.companyId }, select: { status: true, customerGroupId: true } }) : null;
  const viewer: CatalogViewer = { role: isKnownRole(user?.role) ? user.role : "GUEST", companyId: company?.status === "APPROVED" ? user?.companyId ?? undefined : undefined, customerGroupId: company?.status === "APPROVED" ? company.customerGroupId ?? undefined : undefined };

  return <main className="min-h-screen bg-slate-50"><CommerceHeader identity={identity}/><ProductBrowser searchParams={resolved} viewer={viewer} basePath="/urunler"/><CommerceFooter identity={identity}/></main>;
}
