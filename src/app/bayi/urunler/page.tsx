import { requireDealerContext } from "@/data/dealer-context";
import { ProductBrowser } from "@/features/commerce/product-browser";

export const dynamic = "force-dynamic";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DealerProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ company, user }, resolved] = await Promise.all([requireDealerContext("/bayi/urunler"), searchParams]);
  return <ProductBrowser embedded searchParams={resolved} basePath="/bayi/urunler" viewer={{ role: user.role as "DEALER_OWNER" | "DEALER_STAFF", companyId: company.id, customerGroupId: company.customerGroup?.id }} />;
}
