import Link from "next/link";
import { ClipboardList, Truck } from "lucide-react";

import { requireDealerContext } from "@/data/dealer-context";
import { getDealerOrders } from "@/data/dealer-portal";
import {
  formatPortalDate,
  formatPortalMoney,
  PortalStatus,
} from "@/features/dealer/dealer-ui";

export const dynamic = "force-dynamic";

export default async function DealerOrdersPage() {
  const { company } = await requireDealerContext("/bayi/siparisler");
  const orders = await getDealerOrders(company.id);

  return (
    <div className="grid min-w-0 gap-6">
      <section className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-teal-800">
          {company.displayName}
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">
          Sipariş ve sevkiyat takibi
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Firma hesabınıza bağlı siparişlerin durumunu, tutarını ve kargo
          bilgisini tek listeden izleyin.
        </p>
      </section>

      <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {orders.length ? (
          <>
            <div className="divide-y divide-slate-200 md:hidden">
              {orders.map((order) => (
                <article key={order.id} className="grid gap-3 px-4 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/bayi/siparisler/${order.id}`}
                        className="truncate text-sm font-semibold text-teal-900 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatPortalDate(order.createdAt)} ·{" "}
                        {order._count.items} kalem
                      </p>
                    </div>
                    <PortalStatus status={order.status} />
                  </div>
                  <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Sevkiyat
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-700">
                        {order.shipment?.trackingNumber ??
                          order.shipmentMethod ??
                          "Planlanmadı"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-950">
                      {formatPortalMoney(order.subtotal, order.currency)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Sipariş</th>
                    <th className="px-5 py-3">Durum</th>
                    <th className="px-5 py-3">Kalem</th>
                    <th className="px-5 py-3">Tutar</th>
                    <th className="px-5 py-3">Sevkiyat</th>
                    <th className="px-5 py-3">Güncelleme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="text-sm text-slate-700">
                      <td className="px-5 py-4">
                        <Link
                          href={`/bayi/siparisler/${order.id}`}
                          className="font-semibold text-teal-900 hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatPortalDate(order.createdAt)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <PortalStatus status={order.status} />
                      </td>
                      <td className="px-5 py-4">{order._count.items}</td>
                      <td className="px-5 py-4 font-semibold text-slate-950">
                        {formatPortalMoney(order.subtotal, order.currency)}
                      </td>
                      <td className="px-5 py-4">
                        {order.shipment ? (
                          <div>
                            <p className="font-medium text-slate-900">
                              {order.shipment.carrier ??
                                order.shipmentMethod ??
                                "Kargo"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {order.shipment.trackingNumber ??
                                "Takip numarası bekleniyor"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-500">Planlanmadı</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {formatPortalDate(order.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <ClipboardList
              className="mx-auto text-slate-300"
              size={34}
              aria-hidden="true"
            />
            <h3 className="mt-4 text-base font-semibold text-slate-950">
              Sipariş kaydı bulunmuyor
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Onaylanan siparişler ve City Lojistik takip bilgileri bu alanda
              görünecek.
            </p>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <Truck
          className="mt-0.5 shrink-0 text-teal-800"
          size={18}
          aria-hidden="true"
        />
        <p>
          Sevkiyat entegrasyonu sağlayıcıdan doğrulanan takip verisi geldiğinde
          sipariş satırına otomatik işlenecek.
        </p>
      </div>
    </div>
  );
}
