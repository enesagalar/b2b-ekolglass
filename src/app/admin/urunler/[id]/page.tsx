import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CircleDollarSign,
  FileText,
  History,
  Image,
  ShieldCheck,
  Warehouse,
} from "lucide-react";

import { getOrderModeLabel, getProductStatusLabel } from "@/domain/catalog";
import { getStatusLabel } from "@/domain/statuses";
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

  const product = await prisma.product.findUnique({
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
  });

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
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
        </section>
      ) : null}

      {activeTab === "fiyat" ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
        </section>
      ) : null}

      {activeTab === "uyumluluk" ? (
        <section className="grid gap-4">
          {product.compatibilities.length > 0 ? (
            product.compatibilities.map((compatibility) => (
              <article key={compatibility.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">
                  {compatibility.vehicleBrand} {compatibility.vehicleModel}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {[compatibility.yearStart, compatibility.yearEnd].filter(Boolean).join(" - ") || "Yil araligi yok"}
                </p>
                <p className="mt-2 text-sm text-slate-600">{compatibility.oemReference || "OEM referansi yok"}</p>
                {compatibility.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{compatibility.notes}</p> : null}
              </article>
            ))
          ) : (
            <EmptyState title="Uyumluluk kaydi yok" body="Marka/model veya OEM referanslari sonraki alt fazda yonetilecek." />
          )}
        </section>
      ) : null}

      {activeTab === "medya" ? (
        <section className="grid gap-4 md:grid-cols-2">
          {product.mediaAssets.length > 0 ? (
            product.mediaAssets.map((asset) => (
              <article key={asset.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">{asset.title}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">{asset.usage}</p>
                <a href={asset.url} className="mt-4 inline-flex text-sm font-semibold text-teal-800">
                  Dosyayi ac
                </a>
              </article>
            ))
          ) : (
            <div className="md:col-span-2">
              <EmptyState title="Medya veya teknik dosya yok" body="Gorsel, katalog PDF ve teknik dosya modeli var; yonetim UI sonraki alt fazda tamamlanacak." />
            </div>
          )}
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
