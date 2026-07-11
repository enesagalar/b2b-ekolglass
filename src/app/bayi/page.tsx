import Link from "next/link";
import { ArrowRight, Boxes, ClipboardList, FileText, PackageSearch, Truck } from "lucide-react";

import { requireDealerContext } from "@/data/dealer-context";
import { getDealerDashboardData } from "@/data/dealer-portal";
import { formatPortalDate, formatPortalMoney, PortalStatus } from "@/features/dealer/dealer-ui";

export const dynamic = "force-dynamic";

const panelClass = "min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm";

export default async function DealerDashboardPage() {
  const { company, user } = await requireDealerContext("/bayi");
  const dashboard = await getDealerDashboardData(company.id);

  const metrics = [
    { label: "Açık sipariş", value: dashboard.openOrders, icon: ClipboardList, hint: "Aktif operasyon" },
    { label: "Açık teklif", value: dashboard.openQuotes, icon: FileText, hint: "Yanıt bekleyen" },
    { label: "Aktif sevkiyat", value: dashboard.activeShipments, icon: Truck, hint: "Teslim edilmemiş" },
    { label: "Aktif ürün", value: dashboard.activeProducts, icon: Boxes, hint: "Katalog erişimi" },
  ];

  return (
    <div className="grid min-w-0 gap-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-teal-800">{company.displayName}</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">Operasyon özeti</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Hoş geldiniz {user.name}. Sipariş, teklif ve sevkiyat hareketleriniz gerçek zamanlı firma hesabınızdan alınır.
          </p>
        </div>
        <Link
          href="/bayi/urunler"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900"
        >
          <PackageSearch size={17} aria-hidden="true" />
          Kataloğu aç
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Firma metrikleri">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-600">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{metric.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{metric.hint}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-800">
                  <Icon size={19} aria-hidden="true" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className={panelClass}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Son siparişler</h3>
              <p className="mt-1 text-xs text-slate-500">Firma hesabınıza ait son hareketler</p>
            </div>
            <Link href="/bayi/siparisler" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800">
              Tümü <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {dashboard.recentOrders.length ? (
              dashboard.recentOrders.map((order) => (
                <div key={order.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{order.orderNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatPortalDate(order.createdAt)} · {order._count.items} kalem
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-sm font-semibold text-slate-950">{formatPortalMoney(order.subtotal, order.currency)}</span>
                    <PortalStatus status={order.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <ClipboardList className="mx-auto text-slate-300" size={28} aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-800">Henüz sipariş bulunmuyor</p>
                      <p className="mt-1 text-xs text-slate-500">Siparişe uygun ürünleri ürün ve fiyatlar ekranından inceleyebilirsiniz.</p>
              </div>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Son teklifler</h3>
              <p className="mt-1 text-xs text-slate-500">Fiyatlandırma ve özel üretim talepleri</p>
            </div>
            <Link href="/bayi/teklifler" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800">
              Tümü <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {dashboard.recentQuotes.length ? (
              dashboard.recentQuotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{quote.quoteNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatPortalDate(quote.createdAt)} · {quote._count.items} kalem
                    </p>
                  </div>
                  <PortalStatus status={quote.status} />
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <FileText className="mx-auto text-slate-300" size={28} aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-800">Henüz teklif talebi bulunmuyor</p>
                <p className="mt-1 text-xs text-slate-500">Özel üretim ve proje talepleri teklif akışında görünecek.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-t border-slate-200 pt-6 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Müşteri grubu</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{company.customerGroup?.name ?? "Atanmamış"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Ödeme koşulu</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{company.paymentTerms ?? "Tanımlanmamış"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Kredi limiti</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {company.creditLimit ? formatPortalMoney(company.creditLimit) : "Tanımlanmamış"}
          </p>
        </div>
      </section>
    </div>
  );
}
