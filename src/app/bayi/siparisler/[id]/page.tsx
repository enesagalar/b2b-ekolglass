import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  MapPin,
  PackageSearch,
  Truck,
} from "lucide-react";
import { notFound } from "next/navigation";

import { requireDealerContext } from "@/data/dealer-context";
import { getDealerOrderDetail } from "@/data/dealer-portal";
import {
  formatPortalDate,
  formatPortalMoney,
  PortalStatus,
} from "@/features/dealer/dealer-ui";

export const dynamic = "force-dynamic";

export default async function DealerOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, query, { company }] = await Promise.all([
    params,
    searchParams,
    requireDealerContext("/bayi/siparisler"),
  ]);
  const order = await getDealerOrderDetail(company.id, id);
  if (!order) notFound();
  const address = [
    order.deliveryLine1,
    order.deliveryLine2,
    order.deliveryDistrict,
    order.deliveryCity,
    order.deliveryPostalCode,
    order.deliveryCountry,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-6">
      {query.created === "1" ? (
        <section
          className={`flex gap-3 rounded-lg border p-4 ${
            order.commercialReviewRequired
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {order.commercialReviewRequired ? (
            <AlertTriangle className="shrink-0" size={22} />
          ) : (
            <CheckCircle2 className="shrink-0" size={22} />
          )}
          <div>
            <h2 className="font-semibold">
              {order.commercialReviewRequired
                ? "Siparişiniz ticari onaya alındı"
                : "Siparişiniz alındı ve stok ayrıldı"}
            </h2>
            <p className="mt-1 text-sm">
              Sipariş numaranız: <strong>{order.orderNumber}</strong>
              {order.commercialReviewRequired
                ? " · Stok ayrıldı; onaydan sonra hazırlık başlayacak."
                : null}
            </p>
          </div>
        </section>
      ) : null}
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-800">
            {company.displayName}
          </p>
          <h2 className="mt-1 break-all text-2xl font-semibold md:text-3xl">
            {order.orderNumber}
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <PortalStatus status={order.status} />
            <span className="text-xs text-slate-500">
              {formatPortalDate(order.submittedAt ?? order.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.sourceQuote ? <Link href={`/bayi/teklifler/${order.sourceQuote.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold"><FileText size={17} />{order.sourceQuote.quoteNumber}</Link> : null}
          <Link href="/bayi/siparisler" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold"><ArrowLeft size={17} />Tüm siparişler</Link>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold">Sipariş kalemleri</h3>
          </div>
          <div className="divide-y divide-slate-200">
            {order.items.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 p-5 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-teal-800">
                    {item.productCodeSnapshot}
                  </p>
                  <h4 className="mt-1 font-semibold">
                    {item.productNameSnapshot}
                  </h4>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.quantity} adet ·{" "}
                    {item.glassTypeSnapshot || "Cam tipi teyit edilecek"} ·{" "}
                    {item.dimensionsSnapshot || "Ölçü teyit edilecek"}
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-slate-600">{item.notes}</p>
                  ) : null}
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-semibold">
                    {item.lineTotal
                      ? formatPortalMoney(item.lineTotal, order.currency)
                      : "Fiyat bekliyor"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Birim:{" "}
                    {item.unitPrice
                      ? formatPortalMoney(item.unitPrice, order.currency)
                      : "-"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <aside className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <MapPin size={17} className="text-teal-800" />
              <p className="text-xs font-semibold uppercase text-slate-500">
                Teslimat adresi
              </p>
            </div>
            <p className="mt-2 text-sm font-semibold">
              {order.deliveryLabel ?? "Teslimat adresi"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {address || "Adres bilgisi bulunmuyor"}
            </p>
            {order.requestedDeliveryDate ? <p className="mt-2 text-xs font-semibold text-teal-800">İstenen teslim: {formatPortalDate(order.requestedDeliveryDate)}</p> : null}
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Ticari durum
            </p>
            <p className={`mt-2 text-sm font-semibold ${order.commercialReviewRequired && order.status !== "CONFIRMED" ? "text-amber-800" : "text-emerald-800"}`}>
              {order.commercialReviewRequired && order.status !== "CONFIRMED"
                ? "Ticari değerlendirme bekliyor"
                : "Ticari kontrol tamamlandı"}
            </p>
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              KDV hariç toplam
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatPortalMoney(order.subtotal, order.currency)}
            </p>
          </div>
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2">
              <Truck size={17} className="text-teal-800" />
              <p className="text-xs font-semibold uppercase text-slate-500">
                Sevkiyat
              </p>
            </div>
            <p className="mt-2 text-sm">
              {order.shipment?.carrier ??
                order.shipmentMethod ??
                "Satış ekibi planlayacak"}
            </p>
            <p className="mt-1 break-all text-xs text-slate-500">
              {order.shipment?.trackingNumber ?? "Takip numarası bekleniyor"}
            </p>
          </div>
          {order.notes ? (
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Sipariş notu
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {order.notes}
              </p>
            </div>
          ) : null}
          <Link
            href="/urunler"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-800 px-3 text-sm font-semibold text-white"
          >
            <PackageSearch size={16} />
            Ürünlere dön
          </Link>
        </aside>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold">Durum geçmişi</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {order.statusHistory.map((event) => (
            <div
              key={event.id}
              className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center"
            >
              <div>
                <PortalStatus status={event.toStatus} />
              </div>
              <time className="text-xs text-slate-500">
                {formatPortalDate(event.createdAt)}
              </time>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
