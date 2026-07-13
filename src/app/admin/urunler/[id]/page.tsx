import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CircleDollarSign,
  FileText,
  History,
  Image,
  LinkIcon,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Warehouse,
} from "lucide-react";

import { getOrderModeLabel, getProductStatusLabel, stockVisibilities } from "@/domain/catalog";
import { getStatusLabel, stockStatuses } from "@/domain/statuses";
import {
  deleteProductCompatibility,
  saveProductCompatibility,
  saveProductMedia,
  saveProductPrice,
  saveProductStock,
  setProductMediaStatus,
} from "@/features/catalog-management/actions";
import { CatalogActionForm } from "@/features/catalog-management/catalog-action-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ProductDetailParams = Promise<{ id: string }>;
type ProductDetailSearchParams = Promise<Record<string, string | string[] | undefined>>;

const tabs = [
  { key: "genel", label: "Genel", icon: Boxes },
  { key: "stok", label: "Stok", icon: Warehouse },
  { key: "fiyat", label: "Fiyat", icon: CircleDollarSign },
  { key: "uyumluluk", label: "Uyumluluk", icon: ShieldCheck },
  { key: "medya", label: "Medya", icon: Image },
  { key: "audit", label: "Audit", icon: History },
];

const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700";
const labelClass = "grid gap-1.5 text-xs font-semibold text-slate-700";

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

function getSearchParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value || "-"}</p>
    </div>
  );
}

export default async function AdminProductDetailPage({
  params,
  searchParams,
}: {
  params: ProductDetailParams;
  searchParams: ProductDetailSearchParams;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const activeTab = getSearchParam(resolvedSearchParams, "tab") ?? "genel";

  const [product, priceLists] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockItems: { orderBy: { warehouseCode: "asc" } },
        prices: {
          include: { priceList: true },
          orderBy: [{ priceList: { name: "asc" } }, { minQuantity: "asc" }],
        },
        compatibilities: { orderBy: [{ vehicleBrand: "asc" }, { vehicleModel: "asc" }] },
        mediaAssets: { orderBy: [{ isActive: "desc" }, { title: "asc" }] },
      },
    }),
    prisma.priceList.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
  ]);

  if (!product) {
    notFound();
  }

  const auditLogs =
    activeTab === "audit"
      ? await prisma.auditLog.findMany({
          where: { entityType: "Product", entityId: product.id },
          include: { actor: true },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [];

  const vehicle = [product.vehicleBrand, product.vehicleModel].filter(Boolean).join(" ");

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <Link href="/admin/urunler" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft size={16} aria-hidden="true" />
            Urun listesine don
          </Link>
          <p className="mt-5 text-sm font-semibold text-teal-800">{product.category.name}</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{product.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {product.code} kodlu urunun teknik, stok, fiyat ve operasyon gecmisi tek ekranda izlenir.
          </p>
        </div>
        <div className="grid min-w-64 gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-slate-500">Durum</span>
            <span className="rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
              {getProductStatusLabel(product.status)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-slate-500">Satis modu</span>
            <span className="text-sm font-semibold text-slate-950">{getOrderModeLabel(product.orderMode)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-slate-500">Guncelleme</span>
            <span className="text-sm font-semibold text-slate-950">{formatDate(product.updatedAt)}</span>
          </div>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <Link
              key={tab.key}
              href={`/admin/urunler/${product.id}?tab=${tab.key}`}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
                isActive ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "genel" ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <Field label="Urun kodu" value={product.code} />
          <Field label="Kategori" value={product.category.name} />
          <Field label="Arac" value={vehicle || "Proje / olcu bazli"} />
          <Field label="Cam tipi" value={product.glassType} />
          <Field label="Pozisyon" value={product.glassPosition} />
          <Field label="Olcu" value={product.dimensions} />
          <Field label="Kalinlik" value={product.thicknessMm ? `${product.thicknessMm.toString()} mm` : null} />
          <Field label="Renk" value={product.tint} />
          <Field label="Ozel uretim" value={product.isCustomAvailable ? "Uygun" : "Kapali"} />
          <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <FileText size={16} aria-hidden="true" />
              Teknik notlar
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Isleme notlari" value={product.processingNotes} />
              <Field label="Uyumluluk notlari" value={product.compatibilityNotes} />
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "stok" ? (
        <section className="grid gap-4">
          <CatalogActionForm action={saveProductStock} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Plus size={16} aria-hidden="true" />
              Depo stok satiri ekle veya guncelle
            </div>
            <input type="hidden" name="productId" value={product.id} />
            <div className="grid gap-3 lg:grid-cols-6">
              <label className={labelClass}>
                Depo
                <input name="warehouseCode" required defaultValue={product.stockItems[0]?.warehouseCode ?? "MERKEZ"} className={inputClass} />
              </label>
              <label className={labelClass}>
                Stok
                <input name="quantity" type="number" min={0} required defaultValue={product.stockItems[0]?.quantity ?? 0} className={inputClass} />
              </label>
              <label className={labelClass}>
                Rezerve
                <output className={`${inputClass} flex items-center bg-slate-50 text-slate-600`}>
                  {product.stockItems[0]?.reservedQuantity ?? 0}
                </output>
              </label>
              <label className={labelClass}>
                Gorunurluk
                <select name="visibility" defaultValue={product.stockItems[0]?.visibility ?? "SIMPLIFIED"} className={inputClass}>
                  {stockVisibilities.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {visibility}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Durum
                <select name="status" defaultValue={product.stockItems[0]?.status ?? "ASK_FOR_AVAILABILITY"} className={inputClass}>
                  {stockStatuses.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <SubmitButton label="Stok kaydet" />
              </div>
            </div>
          </CatalogActionForm>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {product.stockItems.length > 0 ? (
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Depo</th>
                    <th className="px-4 py-3">Stok</th>
                    <th className="px-4 py-3">Rezerve</th>
                    <th className="px-4 py-3">Uygun</th>
                    <th className="px-4 py-3">Gorunurluk</th>
                    <th className="px-4 py-3">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {product.stockItems.map((stock) => (
                    <tr key={stock.id} className="border-t border-slate-200">
                      <td className="px-4 py-4 font-semibold text-slate-950">{stock.warehouseCode}</td>
                      <td className="px-4 py-4">{stock.quantity}</td>
                      <td className="px-4 py-4">{stock.reservedQuantity}</td>
                      <td className="px-4 py-4">{Math.max(0, stock.quantity - stock.reservedQuantity)}</td>
                      <td className="px-4 py-4">{stock.visibility}</td>
                      <td className="px-4 py-4">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {getStatusLabel(stock.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="Stok satiri yok" body="Bu urune depo bazli stok eklenince burada gorunecek." />
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "fiyat" ? (
        <section className="grid gap-4">
          <CatalogActionForm action={saveProductPrice} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Plus size={16} aria-hidden="true" />
              Fiyat satiri ekle veya guncelle
            </div>
            <input type="hidden" name="productId" value={product.id} />
            <div className="grid gap-3 lg:grid-cols-[1.4fr_0.7fr_0.7fr_auto]">
              <label className={labelClass}>
                Fiyat listesi
                <select name="priceListId" required defaultValue={product.prices[0]?.priceListId ?? priceLists[0]?.id} className={inputClass}>
                  {priceLists.map((priceList) => (
                    <option key={priceList.id} value={priceList.id}>
                      {priceList.name} ({priceList.currency})
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Fiyat
                <input name="amount" inputMode="decimal" required defaultValue={product.prices[0]?.amount.toString() ?? ""} className={inputClass} />
              </label>
              <label className={labelClass}>
                Min. adet
                <input name="minQuantity" type="number" min={1} required defaultValue={product.prices[0]?.minQuantity ?? 1} className={inputClass} />
              </label>
              <div className="flex items-end">
                <SubmitButton label="Fiyat kaydet" />
              </div>
            </div>
          </CatalogActionForm>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {product.prices.length > 0 ? (
              <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Liste</th>
                    <th className="px-4 py-3">Para birimi</th>
                    <th className="px-4 py-3">Min. adet</th>
                    <th className="px-4 py-3">Fiyat</th>
                    <th className="px-4 py-3">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {product.prices.map((price) => (
                    <tr key={price.id} className="border-t border-slate-200">
                      <td className="px-4 py-4 font-semibold text-slate-950">{price.priceList.name}</td>
                      <td className="px-4 py-4">{price.priceList.currency}</td>
                      <td className="px-4 py-4">{price.minQuantity}</td>
                      <td className="px-4 py-4 font-semibold">{price.amount.toString()}</td>
                      <td className="px-4 py-4">{price.priceList.isActive ? "Aktif" : "Pasif"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="Fiyat satiri yok" body="Bu urune fiyat listesi baglaninca burada gorunecek." />
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "uyumluluk" ? (
        <section className="grid gap-4">
          <CatalogActionForm action={saveProductCompatibility} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Plus size={16} aria-hidden="true" />
              Uyumluluk veya OEM referansi ekle
            </div>
            <input type="hidden" name="productId" value={product.id} />
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.5fr_0.5fr]">
              <label className={labelClass}>
                Marka
                <input name="vehicleBrand" required defaultValue={product.vehicleBrand ?? ""} className={inputClass} />
              </label>
              <label className={labelClass}>
                Model
                <input name="vehicleModel" required defaultValue={product.vehicleModel ?? ""} className={inputClass} />
              </label>
              <label className={labelClass}>
                Baslangic
                <input name="yearStart" type="number" min={1900} max={2100} defaultValue={product.yearStart ?? ""} className={inputClass} />
              </label>
              <label className={labelClass}>
                Bitis
                <input name="yearEnd" type="number" min={1900} max={2100} defaultValue={product.yearEnd ?? ""} className={inputClass} />
              </label>
            </div>
            <div className="grid gap-3 lg:grid-cols-[0.8fr_1.4fr_auto]">
              <label className={labelClass}>
                OEM referansi
                <input name="oemReference" className={inputClass} placeholder="OEM / muadil kod" />
              </label>
              <label className={labelClass}>
                Not
                <input name="notes" className={inputClass} placeholder="Montaj, kasa veya teknik not" />
              </label>
              <div className="flex items-end">
                <SubmitButton label="Uyumluluk ekle" />
              </div>
            </div>
          </CatalogActionForm>

          {product.compatibilities.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {product.compatibilities.map((compatibility) => (
                <article key={compatibility.id} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <CatalogActionForm action={saveProductCompatibility} className="grid gap-4">
                    <input type="hidden" name="id" value={compatibility.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {compatibility.vehicleBrand} {compatibility.vehicleModel}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {[compatibility.yearStart, compatibility.yearEnd].filter(Boolean).join(" - ") || "Yil araligi yok"}
                      </p>
                    </div>
                    <div className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className={labelClass}>
                          Marka
                          <input name="vehicleBrand" required defaultValue={compatibility.vehicleBrand} className={inputClass} />
                        </label>
                        <label className={labelClass}>
                          Model
                          <input name="vehicleModel" required defaultValue={compatibility.vehicleModel} className={inputClass} />
                        </label>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className={labelClass}>
                          Baslangic
                          <input name="yearStart" type="number" min={1900} max={2100} defaultValue={compatibility.yearStart ?? ""} className={inputClass} />
                        </label>
                        <label className={labelClass}>
                          Bitis
                          <input name="yearEnd" type="number" min={1900} max={2100} defaultValue={compatibility.yearEnd ?? ""} className={inputClass} />
                        </label>
                      </div>
                      <label className={labelClass}>
                        OEM referansi
                        <input name="oemReference" defaultValue={compatibility.oemReference ?? ""} className={inputClass} />
                      </label>
                      <label className={labelClass}>
                        Not
                        <input name="notes" defaultValue={compatibility.notes ?? ""} className={inputClass} />
                      </label>
                      <div className="flex justify-end">
                        <SubmitButton label="Uyumluluk guncelle" />
                      </div>
                    </div>
                  </CatalogActionForm>
                  <CatalogActionForm action={deleteProductCompatibility} className="flex justify-end">
                    <input type="hidden" name="id" value={compatibility.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Uyumlulugu sil
                    </button>
                  </CatalogActionForm>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Uyumluluk kaydi yok" body="Marka/model veya OEM referanslari eklendiginde burada yonetilecek." />
          )}
        </section>
      ) : null}

      {activeTab === "medya" ? (
        <section className="grid gap-4">
          <CatalogActionForm action={saveProductMedia} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Plus size={16} aria-hidden="true" />
              Medya veya teknik dosya ekle
            </div>
            <input type="hidden" name="productId" value={product.id} />
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.7fr]">
              <label className={labelClass}>
                Baslik
                <input name="title" required className={inputClass} placeholder="Teknik cizim PDF" />
              </label>
              <label className={labelClass}>
                URL
                <input name="url" required type="url" className={inputClass} placeholder="https://..." />
              </label>
              <label className={labelClass}>
                Kullanim
                <select name="usage" defaultValue="TECHNICAL_DOCUMENT" className={inputClass}>
                  <option value="PRODUCT_IMAGE">Urun gorseli</option>
                  <option value="TECHNICAL_DOCUMENT">Teknik dokuman</option>
                  <option value="CATALOG_PDF">Katalog PDF</option>
                  <option value="CERTIFICATE">Sertifika</option>
                </select>
              </label>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_auto]">
              <label className={labelClass}>
                Alternatif metin
                <input name="altText" required className={inputClass} placeholder={`${product.name} teknik dosyasi`} />
              </label>
              <label className={labelClass}>
                Opsiyonel key
                <input name="key" className={inputClass} placeholder="Bos birakilabilir" />
              </label>
              <div className="flex items-end gap-4">
                <label className="inline-flex h-10 items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                  Aktif
                </label>
                <SubmitButton label="Medya ekle" />
              </div>
            </div>
          </CatalogActionForm>

          {product.mediaAssets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {product.mediaAssets.map((asset) => (
                <CatalogActionForm key={asset.id} action={saveProductMedia} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <input type="hidden" name="id" value={asset.id} />
                  <input type="hidden" name="productId" value={product.id} />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{asset.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-slate-500">{asset.usage}</p>
                          <span className={asset.isActive ? "rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800" : "rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"}>
                            {asset.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                      </div>
                      <a href={asset.url} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700">
                        <LinkIcon size={14} aria-hidden="true" />
                      Ac
                    </a>
                  </div>
                  <div className="grid gap-3">
                    <label className={labelClass}>
                      Baslik
                      <input name="title" required defaultValue={asset.title} className={inputClass} />
                    </label>
                    <label className={labelClass}>
                      URL
                      <input name="url" required type="url" defaultValue={asset.url} className={inputClass} />
                    </label>
                    <label className={labelClass}>
                      Alternatif metin
                      <input name="altText" required defaultValue={asset.altText} className={inputClass} />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className={labelClass}>
                        Kullanim
                        <input name="usage" required defaultValue={asset.usage} className={inputClass} />
                      </label>
                      <label className={labelClass}>
                        Key
                        <input name="key" defaultValue={asset.key} className={inputClass} />
                      </label>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" name="isActive" defaultChecked={asset.isActive} className="h-4 w-4 rounded border-slate-300" />
                        Aktif
                      </label>
                      <SubmitButton label="Medya guncelle" />
                    </div>
                  </div>
                </CatalogActionForm>
              ))}
            </div>
          ) : (
            <EmptyState title="Medya veya teknik dosya yok" body="Gorsel, katalog PDF ve teknik dosya URL'i ekleyerek urun dokumanlarini bayiye hazirlayabilirsin." />
          )}
          {product.mediaAssets.length > 0 ? (
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Pasife alma modeli</p>
              <p className="text-sm leading-6 text-slate-600">
                Medya kayitlari silinmez; audit ve CMS referanslari korunarak aktif/pasif durumuyla yayindan kaldirilir.
              </p>
              <div className="flex flex-wrap gap-2">
                {product.mediaAssets.map((asset) => (
                  <CatalogActionForm key={`status-${asset.id}`} action={setProductMediaStatus} className="inline-flex">
                    <input type="hidden" name="id" value={asset.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="isActive" value={asset.isActive ? "false" : "true"} />
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      {asset.isActive ? "Pasife al" : "Aktif et"}: {asset.title}
                    </button>
                  </CatalogActionForm>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "audit" ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {auditLogs.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-950">{log.action}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {log.actor?.name ?? "Sistem"} - {formatDate(log.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Audit kaydi yok" body="Bu urun icin henuz operasyon kaydi bulunmuyor." />
          )}
        </section>
      ) : null}
    </div>
  );
}
