import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  Eye,
  Filter,
  Layers3,
  PackagePlus,
  Save,
  Search,
  Tags,
  Warehouse,
} from "lucide-react";
import Link from "next/link";

import {
  currencies,
  getOrderModeLabel,
  getProductStatusLabel,
  productGlassTypes,
  productOrderModes,
  productStatuses,
  stockVisibilities,
} from "@/domain/catalog";
import { getStatusLabel, stockStatuses } from "@/domain/statuses";
import {
  saveCategory,
  savePriceList,
  saveProductBundle,
  saveProductPrice,
  saveProductStock,
} from "@/features/catalog-management/actions";
import { CatalogActionForm } from "@/features/catalog-management/catalog-action-form";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700";
const textareaClass =
  "min-h-20 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-700";
const labelClass = "grid gap-1.5 text-xs font-semibold text-slate-700";
const panelClass = "rounded-lg border border-slate-200 bg-white p-5 shadow-sm";
const pageSize = 25;

type AdminProductsSearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSearchParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function buildProductWhere({
  query,
  categoryId,
  status,
  stockStatus,
}: {
  query?: string;
  categoryId?: string;
  status?: string;
  stockStatus?: string;
}) {
  const where: Prisma.ProductWhereInput = {};
  const trimmedQuery = query?.trim();

  if (trimmedQuery) {
    where.OR = [
      { code: { contains: trimmedQuery } },
      { name: { contains: trimmedQuery } },
      { vehicleBrand: { contains: trimmedQuery } },
      { vehicleModel: { contains: trimmedQuery } },
      { dimensions: { contains: trimmedQuery } },
      { glassType: { contains: trimmedQuery } },
      { compatibilityNotes: { contains: trimmedQuery } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (status) {
    where.status = status;
  }

  if (stockStatus) {
    where.stockItems = { some: { status: stockStatus } };
  }

  return where;
}

function buildPageHref(currentParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(currentParams);
  params.set("page", String(page));

  return `/admin/urunler?${params.toString()}`;
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      <Save size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

function ProductCoreFields({
  categories,
  product,
}: {
  categories: Array<{ id: string; name: string }>;
  product?: {
    id: string;
    code: string;
    name: string;
    categoryId: string;
    vehicleBrand: string | null;
    vehicleModel: string | null;
    yearStart: number | null;
    yearEnd: number | null;
    glassPosition: string | null;
    glassType: string;
    dimensions: string | null;
    thicknessMm: unknown;
    tint: string | null;
    isTempered: boolean;
    isLaminated: boolean;
    isCustomAvailable: boolean;
    processingNotes: string | null;
    compatibilityNotes: string | null;
    orderMode: string;
    status: string;
  };
}) {
  return (
    <>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <label className={labelClass}>
          Ürün kodu
          <input name="code" required defaultValue={product?.code} className={inputClass} placeholder="EGL-OT-1001" />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Ürün adı
          <input name="name" required defaultValue={product?.name} className={inputClass} placeholder="Fiat Ducato Ön Cam" />
        </label>
        <label className={labelClass}>
          Kategori
          <select name="categoryId" required defaultValue={product?.categoryId ?? categories[0]?.id} className={inputClass}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <label className={labelClass}>
          Marka
          <input name="vehicleBrand" defaultValue={product?.vehicleBrand ?? ""} className={inputClass} placeholder="Mercedes-Benz" />
        </label>
        <label className={labelClass}>
          Model
          <input name="vehicleModel" defaultValue={product?.vehicleModel ?? ""} className={inputClass} placeholder="Sprinter" />
        </label>
        <label className={labelClass}>
          Başlangıç yılı
          <input name="yearStart" type="number" defaultValue={product?.yearStart ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Bitiş yılı
          <input name="yearEnd" type="number" defaultValue={product?.yearEnd ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Pozisyon
          <input name="glassPosition" defaultValue={product?.glassPosition ?? ""} className={inputClass} placeholder="Ön Cam" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <label className={labelClass}>
          Cam tipi
          <select name="glassType" required defaultValue={product?.glassType ?? productGlassTypes[0]} className={inputClass}>
            {productGlassTypes.map((glassType) => (
              <option key={glassType} value={glassType}>
                {glassType}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Ölçü
          <input name="dimensions" defaultValue={product?.dimensions ?? ""} className={inputClass} placeholder="1680 x 980 mm" />
        </label>
        <label className={labelClass}>
          Kalınlık mm
          <input name="thicknessMm" inputMode="decimal" defaultValue={product?.thicknessMm?.toString() ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          Renk
          <input name="tint" defaultValue={product?.tint ?? ""} className={inputClass} placeholder="Yeşil" />
        </label>
        <label className={labelClass}>
          Satış modu
          <select name="orderMode" defaultValue={product?.orderMode ?? "QUOTE_OR_ORDER"} className={inputClass}>
            {productOrderModes.map((mode) => (
              <option key={mode} value={mode}>
                {getOrderModeLabel(mode)}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Yayın durumu
          <select name="status" defaultValue={product?.status ?? "DRAFT"} className={inputClass}>
            {productStatuses.map((status) => (
              <option key={status} value={status}>
                {getProductStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-5 text-sm font-medium text-slate-700">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="isTempered" defaultChecked={product?.isTempered} className="h-4 w-4 rounded border-slate-300" />
          Temperli
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="isLaminated" defaultChecked={product?.isLaminated} className="h-4 w-4 rounded border-slate-300" />
          Lamine
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="isCustomAvailable"
            defaultChecked={product?.isCustomAvailable}
            className="h-4 w-4 rounded border-slate-300"
          />
          Özel üretime uygun
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          İşleme notları
          <textarea name="processingNotes" defaultValue={product?.processingNotes ?? ""} className={textareaClass} />
        </label>
        <label className={labelClass}>
          Uyumluluk notları
          <textarea name="compatibilityNotes" defaultValue={product?.compatibilityNotes ?? ""} className={textareaClass} />
        </label>
      </div>
    </>
  );
}

function StockFields({
  productId,
  stock,
  prefix,
}: {
  productId?: string;
  prefix?: string;
  stock?: {
    warehouseCode: string;
    quantity: number;
    reservedQuantity: number;
    visibility: string;
    status: string;
  };
}) {
  const stockStatusName = prefix ? `${prefix}Status` : "status";

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {productId ? <input type="hidden" name="productId" value={productId} /> : null}
      <label className={labelClass}>
        Depo
        <input name="warehouseCode" required defaultValue={stock?.warehouseCode ?? "MERKEZ"} className={inputClass} />
      </label>
      <label className={labelClass}>
        Stok
        <input name="quantity" type="number" min={0} required defaultValue={stock?.quantity ?? 0} className={inputClass} />
      </label>
      <label className={labelClass}>
        Rezerve
        <input name="reservedQuantity" type="number" min={0} defaultValue={stock?.reservedQuantity ?? 0} className={inputClass} />
      </label>
      <label className={labelClass}>
        Görünürlük
        <select name="visibility" defaultValue={stock?.visibility ?? "SIMPLIFIED"} className={inputClass}>
          {stockVisibilities.map((visibility) => (
            <option key={visibility} value={visibility}>
              {visibility}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Stok durumu
        <select name={stockStatusName} defaultValue={stock?.status ?? "ASK_FOR_AVAILABILITY"} className={inputClass}>
          {stockStatuses.map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function PriceFields({
  productId,
  priceLists,
  price,
}: {
  productId?: string;
  priceLists: Array<{ id: string; name: string; currency: string }>;
  price?: {
    priceListId: string;
    amount: unknown;
    minQuantity: number;
  };
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {productId ? <input type="hidden" name="productId" value={productId} /> : null}
      <label className={labelClass}>
        Fiyat listesi
        <select name="priceListId" required defaultValue={price?.priceListId ?? priceLists[0]?.id} className={inputClass}>
          {priceLists.map((priceList) => (
            <option key={priceList.id} value={priceList.id}>
              {priceList.name} ({priceList.currency})
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Fiyat
        <input name="amount" inputMode="decimal" required defaultValue={price?.amount?.toString() ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Minimum adet
        <input name="minQuantity" type="number" min={1} required defaultValue={price?.minQuantity ?? 1} className={inputClass} />
      </label>
    </div>
  );
}

export default async function AdminProductsPage({ searchParams }: { searchParams: AdminProductsSearchParams }) {
  const resolvedSearchParams = await searchParams;
  const query = getSearchParam(resolvedSearchParams, "q")?.trim() ?? "";
  const categoryId = getSearchParam(resolvedSearchParams, "categoryId") ?? "";
  const status = getSearchParam(resolvedSearchParams, "status") ?? "";
  const stockStatus = getSearchParam(resolvedSearchParams, "stockStatus") ?? "";
  const page = Math.max(1, Number(getSearchParam(resolvedSearchParams, "page") ?? 1) || 1);
  const listParams = new URLSearchParams();

  if (query) listParams.set("q", query);
  if (categoryId) listParams.set("categoryId", categoryId);
  if (status) listParams.set("status", status);
  if (stockStatus) listParams.set("stockStatus", stockStatus);

  const productWhere = buildProductWhere({ query, categoryId, status, stockStatus });

  const [categories, priceLists, products, counts, filteredProductCount] = await Promise.all([
    prisma.productCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    }),
    prisma.priceList.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: productWhere,
      include: {
        category: true,
        stockItems: { orderBy: { warehouseCode: "asc" } },
        prices: {
          include: { priceList: true },
          orderBy: [{ priceList: { name: "asc" } }, { minQuantity: "asc" }],
        },
      },
      orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.stockItem.count({ where: { status: { in: ["LOW_STOCK", "OUT_OF_STOCK"] } } }),
      prisma.priceList.count({ where: { isActive: true } }),
    ]),
    prisma.product.count({ where: productWhere }),
  ]);

  const [totalProducts, activeProducts, stockAlerts, activePriceLists] = counts;
  const canCreateProduct = categories.length > 0 && priceLists.length > 0;
  const totalPages = Math.max(1, Math.ceil(filteredProductCount / pageSize));
  const hasActiveFilter = Boolean(query || categoryId || status || stockStatus);

  return (
    <div className="grid gap-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-teal-800">Ticari veri yönetimi</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Ürün, kategori, fiyat ve stok operasyonu</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Bu ekran public katalogun okuduğu gerçek veriyi yönetir. Yeni ürün kaydı stok ve fiyat satırıyla birlikte
              transaction içinde oluşturulur.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Toplam ürün", value: totalProducts, icon: Boxes },
            { label: "Yayındaki ürün", value: activeProducts, icon: PackagePlus },
            { label: "Stok alarmı", value: stockAlerts, icon: Warehouse },
            { label: "Aktif fiyat listesi", value: activePriceLists, icon: CircleDollarSign },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.label} className={panelClass}>
                <div className="flex items-center justify-between">
                  <Icon size={20} className="text-teal-800" aria-hidden="true" />
                  <span className="text-2xl font-semibold text-slate-950">{metric.value}</span>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-700">{metric.label}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <section className={panelClass}>
            <div className="flex items-center gap-3">
              <PackagePlus size={20} className="text-teal-800" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">Yeni ürün oluştur</h2>
            </div>
            {canCreateProduct ? (
              <CatalogActionForm action={saveProductBundle} className="mt-5 grid gap-5">
                <ProductCoreFields categories={categories} />
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Warehouse size={16} aria-hidden="true" />
                    İlk stok satırı
                  </div>
                  <StockFields prefix="stock" />
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <CircleDollarSign size={16} aria-hidden="true" />
                    İlk fiyat satırı
                  </div>
                  <PriceFields priceLists={priceLists} />
                </div>
                <SubmitButton label="Ürünü oluştur" />
              </CatalogActionForm>
            ) : (
              <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Ürün oluşturmak için en az bir kategori ve bir fiyat listesi gerekir.
              </p>
            )}
          </section>

          <aside className="grid gap-6">
            <section className={panelClass}>
              <div className="flex items-center gap-3">
                <Layers3 size={19} className="text-teal-800" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">Kategori yönetimi</h2>
              </div>
              <CatalogActionForm action={saveCategory} className="mt-5 grid gap-3">
                <label className={labelClass}>
                  Kategori adı
                  <input name="name" required className={inputClass} placeholder="Otomotiv Camı" />
                </label>
                <label className={labelClass}>
                  Slug
                  <input name="slug" className={inputClass} placeholder="Boşsa addan üretilir" />
                </label>
                <label className={labelClass}>
                  Sıra
                  <input name="sortOrder" type="number" min={0} defaultValue={0} className={inputClass} />
                </label>
                <label className={labelClass}>
                  Açıklama
                  <textarea name="description" className={textareaClass} />
                </label>
                <SubmitButton label="Kategori ekle" />
              </CatalogActionForm>
              <div className="mt-5 grid gap-3">
                {categories.map((category) => (
                  <CatalogActionForm key={category.id} action={saveCategory} className="rounded-md border border-slate-200 p-3">
                    <input type="hidden" name="id" value={category.id} />
                    <div className="grid gap-2">
                      <input name="name" defaultValue={category.name} className={inputClass} />
                      <input name="slug" defaultValue={category.slug} className={inputClass} />
                      <input name="sortOrder" type="number" min={0} defaultValue={category.sortOrder} className={inputClass} />
                      <textarea name="description" defaultValue={category.description ?? ""} className={textareaClass} />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">{category._count.products} ürün</span>
                        <SubmitButton label="Güncelle" />
                      </div>
                    </div>
                  </CatalogActionForm>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <div className="flex items-center gap-3">
                <Tags size={19} className="text-teal-800" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">Fiyat listeleri</h2>
              </div>
              <CatalogActionForm action={savePriceList} className="mt-5 grid gap-3">
                <label className={labelClass}>
                  Liste adı
                  <input name="name" required className={inputClass} placeholder="Standart Bayi TRY" />
                </label>
                <label className={labelClass}>
                  Para birimi
                  <select name="currency" defaultValue="TRY" className={inputClass}>
                    {currencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                  Aktif
                </label>
                <SubmitButton label="Fiyat listesi ekle" />
              </CatalogActionForm>
              <div className="mt-5 grid gap-3">
                {priceLists.map((priceList) => (
                  <CatalogActionForm key={priceList.id} action={savePriceList} className="rounded-md border border-slate-200 p-3">
                    <input type="hidden" name="id" value={priceList.id} />
                    <div className="grid gap-2">
                      <input name="name" defaultValue={priceList.name} className={inputClass} />
                      <select name="currency" defaultValue={priceList.currency} className={inputClass}>
                        {currencies.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                          <input type="checkbox" name="isActive" defaultChecked={priceList.isActive} className="h-4 w-4 rounded border-slate-300" />
                          Aktif
                        </label>
                        <SubmitButton label="Güncelle" />
                      </div>
                    </div>
                  </CatalogActionForm>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Urun kayitlari</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredProductCount} kayit listeleniyor. Sayfa {Math.min(page, totalPages)} / {totalPages}.
                </p>
              </div>
              {hasActiveFilter ? (
                <Link href="/admin/urunler" className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700">
                  Filtreleri temizle
                </Link>
              ) : null}
            </div>
            <form className="mt-5 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[1.4fr_0.8fr_0.7fr_0.8fr_auto]" action="/admin/urunler">
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                Arama
                <span className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3">
                  <Search size={16} className="text-slate-400" aria-hidden="true" />
                  <input
                    name="q"
                    defaultValue={query}
                    className="w-full bg-transparent text-sm font-normal outline-none"
                    placeholder="Kod, urun adi, marka, model, olcu"
                  />
                </span>
              </label>
              <label className={labelClass}>
                Kategori
                <select name="categoryId" defaultValue={categoryId} className={inputClass}>
                  <option value="">Tum kategoriler</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Yayin
                <select name="status" defaultValue={status} className={inputClass}>
                  <option value="">Tum durumlar</option>
                  {productStatuses.map((productStatus) => (
                    <option key={productStatus} value={productStatus}>
                      {getProductStatusLabel(productStatus)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Stok
                <select name="stockStatus" defaultValue={stockStatus} className={inputClass}>
                  <option value="">Tum stoklar</option>
                  {stockStatuses.map((currentStockStatus) => (
                    <option key={currentStockStatus} value={currentStockStatus}>
                      {getStatusLabel(currentStockStatus)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900 xl:self-end"
              >
                <Filter size={16} aria-hidden="true" />
                Filtrele
              </button>
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Kod</th>
                  <th className="px-4 py-3">Ürün</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Stok</th>
                  <th className="px-4 py-3">Fiyat</th>
                  <th className="px-4 py-3">Yönetim</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stock = product.stockItems[0];
                  const price = product.prices[0];
                  const vehicle = [product.vehicleBrand, product.vehicleModel].filter(Boolean).join(" ");
                  return (
                    <tr key={product.id} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-900">{product.code}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">{product.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{vehicle || "Proje / ölçü bazlı"}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{product.category.name}</td>
                      <td className="px-4 py-4">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {getProductStatusLabel(product.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{stock ? `${stock.quantity} adet` : "Stok yok"}</p>
                        <p className="mt-1 text-xs text-slate-500">{stock ? getStatusLabel(stock.status) : "Depo satırı ekleyin"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {price ? `${price.priceList.currency} ${price.amount.toString()}` : "Fiyat yok"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{price ? price.priceList.name : "Liste satırı ekleyin"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/urunler/${product.id}`}
                          className="mb-3 inline-flex h-9 items-center gap-2 rounded-md bg-teal-800 px-3 text-xs font-semibold text-white transition hover:bg-teal-900"
                        >
                          <Eye size={14} aria-hidden="true" />
                          Detay
                        </Link>
                        <details className="group">
                          <summary className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800">
                            Düzenle
                          </summary>
                          <div className="mt-4 grid w-[720px] max-w-[80vw] gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                            <CatalogActionForm action={saveProductBundle} className="grid gap-4">
                              <ProductCoreFields categories={categories} product={product} />
                              <StockFields
                                prefix="stock"
                                stock={
                                  stock
                                    ? {
                                        warehouseCode: stock.warehouseCode,
                                        quantity: stock.quantity,
                                        reservedQuantity: stock.reservedQuantity,
                                        visibility: stock.visibility,
                                        status: stock.status,
                                      }
                                    : undefined
                                }
                              />
                              <PriceFields
                                priceLists={priceLists}
                                price={
                                  price
                                    ? {
                                        priceListId: price.priceListId,
                                        amount: price.amount,
                                        minQuantity: price.minQuantity,
                                      }
                                    : undefined
                                }
                              />
                              <SubmitButton label="Ürün paketini güncelle" />
                            </CatalogActionForm>

                            <CatalogActionForm action={saveProductStock} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3">
                              <p className="text-xs font-semibold uppercase text-slate-500">Sadece stok güncelle</p>
                              <StockFields productId={product.id} stock={stock ?? undefined} />
                              <SubmitButton label="Stok kaydet" />
                            </CatalogActionForm>

                            <CatalogActionForm action={saveProductPrice} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3">
                              <p className="text-xs font-semibold uppercase text-slate-500">Sadece fiyat güncelle</p>
                              <PriceFields
                                productId={product.id}
                                priceLists={priceLists}
                                price={
                                  price
                                    ? {
                                        priceListId: price.priceListId,
                                        amount: price.amount,
                                        minQuantity: price.minQuantity,
                                      }
                                    : undefined
                                }
                              />
                              <SubmitButton label="Fiyat kaydet" />
                            </CatalogActionForm>
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                      Bu filtrelerle eslesen urun bulunamadi.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 md:flex-row md:items-center">
            <p className="text-xs font-medium text-slate-500">
              {pageSize} kayit/sayfa. Toplam {filteredProductCount} kayit.
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={buildPageHref(listParams, Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold ${
                  page <= 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Onceki
              </Link>
              <Link
                href={buildPageHref(listParams, Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
                className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold ${
                  page >= totalPages ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Sonraki
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
    </div>
  );
}
