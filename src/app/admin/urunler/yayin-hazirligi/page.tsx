import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
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
  const firstMissingPrice = rows.find((row) => !row.hasGeneralPrice);
  const firstMissingStock = rows.find((row) => row.availableStock <= 0);

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
            Ürünleri yayına hazırlayın
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Bir ürünün satışa açılması için standart bayi fiyatı ve kullanılabilir stoku birlikte tanımlı olmalıdır. Önce eksikleri giderin, ardından hazır ürünleri topluca yayınlayın.
          </p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900 lg:max-w-md">
          <strong className="block font-semibold">İşlemin etkisi</strong>
          <span className="mt-1 block">Yayınlanan ürünler ana sayfada ve bayi kataloğunda satışa açılır. Fiyat ve stok son kez sunucuda doğrulanır.</span>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Yayın hazırlığı özeti">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Taslak ürün", value: rows.length, icon: PackageCheck, tone: "text-slate-700 bg-slate-100" },
          { label: "Yayına hazır", value: readyCount, icon: PackageCheck, tone: "text-emerald-700 bg-emerald-100" },
          { label: "Genel fiyatı eksik", value: missingPriceCount, icon: CircleDollarSign, tone: "text-amber-700 bg-amber-100" },
          { label: "Kullanılabilir stoku yok", value: missingStockCount, icon: Warehouse, tone: "text-red-700 bg-red-100" },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="flex items-center gap-4 border-b border-slate-200 p-4 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0">
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
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Önerilen sıra</p>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">1</span>
              <div><p className="text-sm font-semibold text-slate-950">Fiyatı tamamlayın</p><p className="mt-1 text-xs leading-5 text-slate-500">{missingPriceCount.toLocaleString("tr-TR")} ürün bekliyor.</p></div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">2</span>
              <div><p className="text-sm font-semibold text-slate-950">Stoku tamamlayın</p><p className="mt-1 text-xs leading-5 text-slate-500">{missingStockCount.toLocaleString("tr-TR")} ürün bekliyor.</p></div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-800 text-xs font-semibold text-white">3</span>
              <div><p className="text-sm font-semibold text-slate-950">Hazırları yayınlayın</p><p className="mt-1 text-xs leading-5 text-slate-500">{readyCount.toLocaleString("tr-TR")} ürün yayınlanabilir.</p></div>
            </li>
          </ol>
        </div>
        <div className={`rounded-lg border p-5 ${readyCount > 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex gap-3">
            {readyCount > 0 ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-700" /> : <PackageCheck size={20} className="mt-0.5 shrink-0 text-amber-700" />}
            <div>
              <p className="font-semibold text-slate-950">{readyCount > 0 ? `${readyCount.toLocaleString("tr-TR")} ürün yayına hazır` : "Önce ürün eksiklerini giderin"}</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">{readyCount > 0 ? "Hazır ürünleri filtreleyip kontrol ederek topluca yayınlayabilirsiniz." : "Fiyatı veya kullanılabilir stoku olmayan ürünler yayınlanamaz."}</p>
              {readyCount > 0 ? (
                <Link href="/admin/urunler/yayin-hazirligi?hazirlik=READY" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800">Hazır ürünleri göster <ArrowRight size={15} /></Link>
              ) : firstMissingPrice ? (
                <Link href={`/admin/urunler/${firstMissingPrice.id}?tab=fiyat`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800">İlk fiyat eksiğini düzelt <ArrowRight size={15} /></Link>
              ) : firstMissingStock ? (
                <Link href={`/admin/urunler/${firstMissingStock.id}?tab=stok`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800">İlk stok eksiğini düzelt <ArrowRight size={15} /></Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 border-b border-slate-100 pb-4">
          <h2 className="text-sm font-semibold text-slate-950">Kontrol listesini daraltın</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Eksik fiyat veya stok filtresini seçerek düzeltilmesi gereken ürünleri bulun. Yayınlama için “Yayına hazır” filtresini kullanın.</p>
        </div>
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
        <p className="text-xs font-medium text-slate-500">Güvenli toplu işlem sınırı: 50 ürün</p>
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
