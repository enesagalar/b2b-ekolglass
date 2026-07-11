import Link from "next/link";
import { Filter, PackageSearch, Search } from "lucide-react";

import {
  canViewCatalogPrices,
  productGlassTypes,
  resolveCatalogStockSummary,
  selectCatalogPrice,
  type CatalogViewer,
} from "@/domain/catalog";
import { buildCatalogPriceWhere } from "@/data/catalog-access";
import { isAdminRole, isKnownRole } from "@/domain/roles";
import { getStatusLabel } from "@/domain/statuses";
import { stockStatuses } from "@/domain/statuses";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CatalogSearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSearchParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function buildCatalogWhere({
  query,
  categoryId,
  glassType,
  stockStatus,
}: {
  query?: string;
  categoryId?: string;
  glassType?: string;
  stockStatus?: string;
}) {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  const trimmedQuery = query?.trim();

  if (trimmedQuery) {
    where.OR = [
      { code: { contains: trimmedQuery } },
      { name: { contains: trimmedQuery } },
      { vehicleBrand: { contains: trimmedQuery } },
      { vehicleModel: { contains: trimmedQuery } },
      { dimensions: { contains: trimmedQuery } },
      { compatibilityNotes: { contains: trimmedQuery } },
      {
        compatibilities: {
          some: {
            OR: [
              { vehicleBrand: { contains: trimmedQuery } },
              { vehicleModel: { contains: trimmedQuery } },
              { oemReference: { contains: trimmedQuery } },
              { notes: { contains: trimmedQuery } },
            ],
          },
        },
      },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (glassType) {
    where.glassType = glassType;
  }

  if (stockStatus) {
    where.stockItems = { some: { status: stockStatus } };
  }

  return where;
}

export default async function CatalogPage({ searchParams }: { searchParams: CatalogSearchParams }) {
  const resolvedSearchParams = await searchParams;
  const query = getSearchParam(resolvedSearchParams, "q")?.trim() ?? "";
  const categoryId = getSearchParam(resolvedSearchParams, "categoryId") ?? "";
  const glassType = getSearchParam(resolvedSearchParams, "glassType") ?? "";
  const stockStatus = getSearchParam(resolvedSearchParams, "stockStatus") ?? "";
  const where = buildCatalogWhere({ query, categoryId, glassType, stockStatus });
  const hasActiveFilter = Boolean(query || categoryId || glassType || stockStatus);
  const currentUser = await getCurrentUser();
  const userCompany = currentUser?.companyId
    ? await prisma.company.findUnique({
        where: { id: currentUser.companyId },
        select: { customerGroupId: true, status: true },
      })
    : null;
  const resolvedRole = isKnownRole(currentUser?.role) ? currentUser.role : "GUEST";
  const hasApprovedCompanyContext = isAdminRole(resolvedRole) || userCompany?.status === "APPROVED";
  const viewer: CatalogViewer = {
    role: resolvedRole,
    companyId: hasApprovedCompanyContext ? currentUser?.companyId : undefined,
    customerGroupId: hasApprovedCompanyContext ? userCompany?.customerGroupId : undefined,
  };
  const canSeePrices = canViewCatalogPrices(viewer);
  const priceWhere = buildCatalogPriceWhere(viewer);

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        stockItems: true,
        prices: {
          where: priceWhere,
          include: { priceList: true },
          orderBy: { minQuantity: "asc" },
        },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { code: "asc" }],
    }),
    prisma.productCategory.findMany({
      where: { products: { some: { status: "ACTIVE" } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="font-semibold text-slate-950">
            EkolGlass B2B
          </Link>
          <Link href="/bayi-basvurusu" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white">
            Bayi başvurusu
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-teal-800">Ürün kataloğu</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Araç, kod, ölçü ve cam tipine göre arama</h1>
            <p className="hidden">
              Ürünler, kategori, stok ve fiyat listesi ilişkileriyle veritabanından okunur. Fiyat görünürlüğü
              bir sonraki auth fazında bayi yetkisine göre uygulanacak.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Urunler kategori, stok ve fiyat listesi iliskileriyle veritabanindan okunur. Fiyat ve stok detaylari
              oturumdaki bayi veya ekip rolune gore gosterilir.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium">
              <Filter size={16} aria-hidden="true" />
              Filtreler
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">
              <PackageSearch size={16} aria-hidden="true" />
              Hızlı sipariş
            </button>
          </div>
        </div>

        <form className="mt-8 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_auto]" action="/katalog">
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Katalogda ara
            <span className="flex h-11 items-center gap-3 rounded-md border border-slate-300 px-4">
              <Search size={18} className="text-slate-400" aria-hidden="true" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Urun kodu, marka, model, olcu veya OEM"
                className="w-full bg-transparent text-sm font-normal outline-none"
              />
            </span>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Kategori
            <select name="categoryId" defaultValue={categoryId} className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700">
              <option value="">Tum kategoriler</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Cam tipi
            <select name="glassType" defaultValue={glassType} className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700">
              <option value="">Tum cam tipleri</option>
              {productGlassTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Stok
            <select name="stockStatus" defaultValue={stockStatus} className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700">
              <option value="">Tum stoklar</option>
              {stockStatuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 lg:self-end">
            <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900">
              <Filter size={16} aria-hidden="true" />
              Filtrele
            </button>
            {hasActiveFilter ? (
              <Link href="/katalog" className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700">
                Temizle
              </Link>
            ) : null}
          </div>
        </form>

        <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-600">
          <span>{products.length} urun listeleniyor</span>
          <span>{canSeePrices ? "Fiyatlar yetkine gore listeleniyor" : "Fiyatlar bayi girisiyle gorunur"}</span>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Ürün kodu</th>
                <th className="px-4 py-3">Ürün</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Araç / kullanım</th>
                <th className="px-4 py-3">Cam tipi</th>
                <th className="px-4 py-3">Stok</th>
                <th className="px-4 py-3">Fiyat temeli</th>
                <th className="px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const stock = resolveCatalogStockSummary(product.stockItems, viewer);
                const selectedPrice = selectCatalogPrice(product.prices, viewer);
                const firstPrice = selectedPrice;
                const vehicle = [product.vehicleBrand, product.vehicleModel].filter(Boolean).join(" ");
                return (
                  <tr key={product.code} className="border-t border-slate-200">
                    <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-900">{product.code}</td>
                    <td className="px-4 py-4 font-medium text-slate-950">{product.name}</td>
                    <td className="px-4 py-4 text-slate-600">{product.category.name}</td>
                    <td className="px-4 py-4 text-slate-600">{vehicle || "Proje bazlı"}</td>
                    <td className="px-4 py-4 text-slate-600">{product.glassType}</td>
                    <td className="px-4 py-4">
                      <span className="rounded bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">
                        {stock.label}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">{stock.detail}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {firstPrice ? `${firstPrice.priceList.currency} ${firstPrice.amount.toString()}` : "Yetkiye bağlı"}
                    </td>
                    <td className="px-4 py-4">
                      <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800">
                        {product.orderMode === "QUOTE_ONLY" ? "Teklif iste" : "Sipariş / teklif"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    Bu filtrelerle eslesen yayindaki urun bulunamadi.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
