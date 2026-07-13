import { randomUUID } from "node:crypto";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";
import { notFound } from "next/navigation";

import { getAdminOrderDetail } from "@/data/admin-orders";
import {
  getAllowedOrderTransitions,
  getOrderTransitionPermission,
  isOrderStatus,
} from "@/domain/order-transitions";
import { hasPermission, isKnownRole } from "@/domain/roles";
import {
  formatPortalDate,
  formatPortalMoney,
  PortalStatus,
} from "@/features/dealer/dealer-ui";
import { requirePermissionUser } from "@/lib/auth";
import { AdminOrderStatusForm } from "@/features/orders/admin-order-status-form";

export const dynamic = "force-dynamic";
const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";

export default async function AdminOrderDetailPage({
  params,
}: PageProps<"/admin/siparisler/[id]">) {
  const { id } = await params;
  const actor = await requirePermissionUser(
    "order.track",
    `/admin/siparisler/${id}`,
  );
  const order = await getAdminOrderDetail(id);
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
  const knownRole = isKnownRole(actor.role) ? actor.role : null;
  const canReadPrice = Boolean(
    knownRole && hasPermission(knownRole, "price.read"),
  );
  const canReadStock = Boolean(
    knownRole && hasPermission(knownRole, "stock.read.detailed"),
  );
  const currentStatus = isOrderStatus(order.status) ? order.status : null;
  const transitions = getAllowedOrderTransitions(
    order.status,
    order.heldFromStatus,
  ).filter((target) =>
    Boolean(
      knownRole &&
      hasPermission(
        knownRole,
        getOrderTransitionPermission(order.status, target),
      ),
    ),
  );

  return (
    <div className="grid gap-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end">
        <div>
          <Link
            href="/admin/siparisler"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
          >
            <ArrowLeft size={16} />
            Sipariş listesine dön
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="break-all text-2xl font-semibold">
              {order.orderNumber}
            </h2>
            <PortalStatus status={order.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {formatPortalDate(order.submittedAt ?? order.createdAt)} ·{" "}
            {order.items.length} kalem
          </p>
        </div>
        <Link
          href={`/admin/firmalar/${order.company.id}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold"
        >
          <Building2 size={16} />
          Firma kartını aç
        </Link>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="grid gap-6">
          <section className={`${panelClass} overflow-hidden`}>
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="font-semibold">
                Sipariş kalemleri ve rezervasyonlar
              </h3>
            </div>
            <div className="divide-y divide-slate-200">
              {order.items.map((item) => (
                <article key={item.id} className="p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <p className="font-mono text-xs font-semibold text-teal-800">
                        {item.productCodeSnapshot}
                      </p>
                      <h4 className="mt-1 font-semibold">
                        {item.productNameSnapshot}
                      </h4>
                      <p className="mt-2 text-xs text-slate-500">
                        {item.quantity} adet ·{" "}
                        {item.glassTypeSnapshot || "Cam tipi yok"} ·{" "}
                        {item.dimensionsSnapshot || "Ölçü yok"}
                      </p>
                    </div>
                    {canReadPrice ? (
                      <div className="sm:text-right">
                        <p className="font-semibold">
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
                    ) : null}
                  </div>
                  {canReadStock && item.reservations.length ? (
                    <div className="mt-4 grid gap-2 rounded-md bg-slate-50 p-3">
                      {item.reservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          className="flex flex-col justify-between gap-1 text-xs sm:flex-row"
                        >
                          <span>
                            <strong>
                              {reservation.stockItem.warehouseCode}
                            </strong>
                          </span>
                          <span>
                            {reservation.quantity} adet · {reservation.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : canReadStock ? (
                    <p className="mt-4 text-xs text-amber-800">
                      Bu kalem için stok rezervasyonu bulunmuyor.
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
          <section className={panelClass}>
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
                    <p className="mt-2 text-xs text-slate-500">
                      {event.fromStatus
                        ? `${event.fromStatus} → ${event.toStatus}`
                        : event.toStatus}{" "}
                      ·{" "}
                      {event.changedBy?.name ??
                        event.changedBy?.email ??
                        "Sistem"}
                    </p>
                    {event.note ? (
                      <p className="mt-2 text-sm text-slate-600">
                        {event.note}
                      </p>
                    ) : null}
                  </div>
                  <time className="text-xs text-slate-500">
                    {formatPortalDate(event.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid gap-5">
          <section className={`${panelClass} p-5`}>
            <p className="text-xs font-semibold uppercase text-teal-800">
              Operasyon kararı
            </p>
            <h3 className="mt-1 font-semibold">Sipariş durumunu yönet</h3>
            <div className="mt-4">
              {transitions.length ? (
                <AdminOrderStatusForm
                  orderId={order.id}
                  expectedStatus={currentStatus!}
                  expectedVersion={order.version}
                  idempotencyKey={randomUUID()}
                  transitions={transitions}
                />
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Bu hesabın sipariş durumunu değiştirme yetkisi yok.
                </p>
              )}
            </div>
          </section>
          <section className={`${panelClass} p-5`}>
            <div className="flex items-center gap-2">
              <Building2 size={17} className="text-teal-800" />
              <p className="text-xs font-semibold uppercase text-slate-500">
                Firma ve bayi
              </p>
            </div>
            <p className="mt-3 font-semibold">{order.company.displayName}</p>
            <p className="mt-1 text-sm text-slate-500">
              {order.createdBy?.name ?? "Sistem"}
            </p>
            <p className="mt-1 break-all text-xs text-slate-500">
              {order.createdBy?.email ?? order.company.email}
            </p>
          </section>
          <section className={`${panelClass} p-5`}>
            <div className="flex items-center gap-2">
              <MapPin size={17} className="text-teal-800" />
              <p className="text-xs font-semibold uppercase text-slate-500">
                Teslimat
              </p>
            </div>
            <p className="mt-3 font-semibold">
              {order.deliveryLabel ?? "Teslimat adresi"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {address || "Adres bilgisi yok"}
            </p>
          </section>
          <section className={`${panelClass} p-5`}>
            <div className="flex items-center gap-2">
              <Truck size={17} className="text-teal-800" />
              <p className="text-xs font-semibold uppercase text-slate-500">
                Sevkiyat
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold">
              {order.shipment?.carrier ?? order.shipmentMethod ?? "Planlanmadı"}
            </p>
            <p className="mt-1 break-all text-xs text-slate-500">
              {order.shipment?.trackingNumber ?? "Takip numarası yok"}
            </p>
          </section>
          {canReadPrice ? (
            <section className={`${panelClass} p-5`}>
              <div className="flex items-center gap-2">
                <PackageCheck size={17} className="text-teal-800" />
                <p className="text-xs font-semibold uppercase text-slate-500">
                  KDV hariç toplam
                </p>
              </div>
              <p className="mt-3 text-2xl font-semibold">
                {formatPortalMoney(order.subtotal, order.currency)}
              </p>
              {order.notes ? (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Bayi notu
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {order.notes}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
