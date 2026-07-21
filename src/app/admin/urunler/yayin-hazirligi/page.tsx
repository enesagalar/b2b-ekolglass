import {
  ArrowLeft,
  ArrowRight,
  CircleDollarSign,
  Filter,
  PackageCheck,
  Search,
  Warehouse,
} from "lucide-react";
import Link from "next/link";

import { getProductPublicationReadiness } from "@/domain/catalog";
import {
  PublicationSelectionForm,
  type PublicationProductRow,
} from "@/features/catalog-management/publication-selection-form";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const pageSize = 50;
const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildPageHref(currentParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(currentParams);
  params.set("page", String(page));
  return `/admin/urunler/yayin-hazirligi?${params.toString()}`;
}

export default async function ProductPublicationReadinessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermissionUser(
    "product.manage",
    "/admin/urunler/yayin-hazirligi",
  );

  const resolvedSearchParams = await searchParams;
  const query = getSearchParam(resolvedSearchParams, "q")?.trim() ?? "";
  const categoryId = getSearchParam(resolvedSearchParams, "categoryId") ?? "";
  const readinessFilter = getSearchParam(resolvedSearchParams, "hazirlik") ?? "";
  const requestedPage = Math.max(
    1,
    Number(getSearchParam(resolvedSearchParams, "page") ?? 1) || 1,
  );

  const [categories, draftProducts] = await Promise.all([
    prisma.productCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { status: "DRAFT" },
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        categoryId: true,
        category: { select: { name: true } },
        prices: {
          select: {
            amount: true,
            minQuantity: true,
            priceList: {
              select: {
                companyId: true,
                customerGroupId: true,
                isActive: true,
                startsAt: true,
                endsAt: true,
              },
            },
          },
        },
        stockItems: {
          select: { quantity: true, reservedQuantity: true },
        },
      },
    }),
  ]);

  const rows: PublicationProductRow[] = draftProducts.map((product) => {
    const readiness = getProductPublicationReadiness(product);
    return {
      id: product.id,
      code: product.code,
      name: product.name,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      hasGeneralPrice: readiness.hasGeneralPrice,
      availableStock: readiness.availableStock,
      isReady: readiness.isReady,
    };
  });
  const readyCount = rows.filter((row) => row.isReady).length;
  const missingPriceCount = rows.filter((row) => !row.hasGeneralPrice).length;
  const missingStockCount = rows.filter((row) => row.availableStock <= 0).length;
  const normalizedQuery = query.toLocaleLowerCase("tr-TR");
  const filteredRows = rows.filter((row) => {
    const matchesQuery =
      !normalizedQuery ||
      `${row.code} ${row.name} ${row.categoryName}`
        .toLocaleLowerCase("tr-TR")
        .includes(normalizedQuery);
    const matchesCategory = !categoryId || row.categoryId === categoryId;
    const matchesReadiness =
      !readinessFilter ||
      (readinessFilter === "READY" && row.isReady) ||
      (readinessFilter === "MISSING_PRICE" && !row.hasGeneralPrice) ||
      (readinessFilter === "MISSING_STOCK" && row.availableStock <= 0);
    return matchesQuery && matchesCategory && matchesReadiness;
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const listParams = new URLSearchParams();
  if (query) listParams.set("q", query);
  if (categoryId) listParams.set("categoryId", categoryId);
  if (readinessFilter) listParams.set("hazirlik", readinessFilter);
  const hasFilters = Boolean(query || categoryId || readinessFilter);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/admin/urunler"
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-700"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Ürün yönetimine dön
          </Link>
          <p className="mt-5 text-sm font-medium text-teal-800">Katalog operasyonu</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Toplu yayın hazırlığı
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Taslak ürünlerin standart bayi fiyatını ve kullanılabilir stokunu birlikte kontrol edin. Yalnız iki koşulu da sağlayan ürünler seçilebilir.
          </p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900 lg:max-w-md">
          Yayınlama işlemi ürünleri ana sayfaya ve bayi kataloğuna açar. İşlem öncesinde fiyat ve stok koşulları sunucuda tekrar doğrulanır.
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Yayın hazırlığı özeti">
        {[
          { label: "Taslak ürün", value: rows.length, icon: PackageCheck, tone: "text-slate-700 bg-slate-100" },
          { label: "Yayına hazır", value: readyCount, icon: PackageCheck, tone: "text-emerald-700 bg-emerald-100" },
          { label: "Genel fiyatı eksik", value: missingPriceCount, icon: CircleDollarSign, tone: "text-amber-700 bg-amber-100" },
          { label: "Kullanılabilir stoku yok", value: missingStockCount, icon: Warehouse, tone: "text-red-700 bg-red-100" },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${metric.tone}`}>
                <Icon size={19} aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-semibold text-slate-950">{metric.value.toLocaleString("tr-TR")}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{metric.label}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_220px_auto] lg:items-end">
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Ürün ara
            <span className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
              <input name="q" defaultValue={query} className={`${inputClass} pl-9`} placeholder="Kod, ürün veya kategori" />
            </span>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Kategori
            <select name="categoryId" defaultValue={categoryId} className={inputClass}>
              <option value="">Tüm kategoriler</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Hazırlık durumu
            <select name="hazirlik" defaultValue={readinessFilter} className={inputClass}>
              <option value="">Tüm taslaklar</option>
              <option value="READY">Yayına hazır</option>
              <option value="MISSING_PRICE">Genel fiyatı eksik</option>
              <option value="MISSING_STOCK">Stoku eksik</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
              <Filter size={16} aria-hidden="true" />
              Filtrele
            </button>
            {hasFilters ? <Link href="/admin/urunler/yayin-hazirligi" className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-500">Temizle</Link> : null}
          </div>
        </form>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          <strong className="font-semibold text-slate-950">{filteredRows.length.toLocaleString("tr-TR")}</strong> taslak ürün gösteriliyor
        </p>
        <p className="text-xs font-medium text-slate-500">Tek işlem sınırı: 50 ürün</p>
      </div>

      <PublicationSelectionForm
        key={visibleRows.map((row) => row.id).join(":")}
        rows={visibleRows}
      />

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between border-t border-slate-200 pt-4" aria-label="Yayın hazırlığı sayfaları">
          {page > 1 ? <Link href={buildPageHref(listParams, page - 1)} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"><ArrowLeft size={16} aria-hidden="true" />Önceki</Link> : <span />}
          <span className="text-sm font-medium text-slate-600">Sayfa {page} / {totalPages}</span>
          {page < totalPages ? <Link href={buildPageHref(listParams, page + 1)} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700">Sonraki<ArrowRight size={16} aria-hidden="true" /></Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
