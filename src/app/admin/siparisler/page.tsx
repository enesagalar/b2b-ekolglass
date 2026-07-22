import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Filter,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";

import { getAdminOrders } from "@/data/admin-orders";
import { hasPermission, isKnownRole } from "@/domain/roles";
import { orderStatuses } from "@/domain/statuses";
import {
  formatPortalDate,
  formatPortalMoney,
  PortalStatus,
} from "@/features/dealer/dealer-ui";
import { requirePermissionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const pageSize = 25;
const panelClass = "rounded-lg border border-slate-200 bg-white";
const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(query: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return `/admin/siparisler?${params.toString()}`;
}

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/siparisler">) {
  const actor = await requirePermissionUser("order.track", "/admin/siparisler");
  const canReadPrice =
    isKnownRole(actor.role) && hasPermission(actor.role, "price.read");
  const params = await searchParams;
  const query = first(params.q)?.trim() ?? "";
  const status = first(params.status)?.trim() ?? "";
  const requestedPage = Number.parseInt(first(params.page) ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const data = await getAdminOrders({ query, status, page, pageSize });
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const metrics = [
    {
      label: "Onay bekleyen",
      value: data.submitted,
      icon: ClipboardCheck,
      tone: "bg-amber-50 text-amber-800",
    },
    {
      label: "Hazırlanan",
      value: data.preparing,
      icon: PackageCheck,
      tone: "bg-blue-50 text-blue-800",
    },
    {
      label: "Sevke hazır",
      value: data.readyToShip,
      icon: Truck,
      tone: "bg-teal-50 text-teal-800",
    },
  ];

  return (
    <div className="grid gap-6">
      <section className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-teal-800">Satış operasyonu</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Bayilerden gelen siparişleri, teslimat bilgilerini ve ayrılan stokları
          firma bazında izleyin.
        </p>
      </section>

      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="p-5">
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-md ${metric.tone}`}
                >
                  <Icon size={19} />
                </span>
                <strong className="text-2xl">{metric.value}</strong>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {metric.label}
              </p>
            </article>
          );
        })}
      </section>

      <section className={`${panelClass} min-w-0 overflow-hidden`}>
        <form className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative">
            <span className="sr-only">Siparişlerde ara</span>
            <Search
              className="pointer-events-none absolute left-3 top-3 text-slate-400"
              size={17}
            />
            <input
              name="q"
              defaultValue={query}
              className={`${inputClass} pl-10`}
              placeholder="Sipariş no, firma veya kullanıcı"
            />
          </label>
          <label>
            <span className="sr-only">Sipariş durumu</span>
            <select name="status" defaultValue={status} className={inputClass}>
              <option value="">Tüm durumlar</option>
              {orderStatuses
                .filter((item) => item !== "DRAFT")
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
          >
            <Filter size={16} />
            Filtrele
          </button>
        </form>

        {data.orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Sipariş</th>
                  <th className="px-5 py-3">Firma / bayi</th>
                  <th className="px-5 py-3">Teslimat</th>
                  {canReadPrice ? <th className="px-5 py-3">Tutar</th> : null}
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-mono text-sm font-semibold text-slate-950">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatPortalDate(order.submittedAt ?? order.createdAt)}{" "}
                        · {order._count.items} kalem
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/firmalar/${order.company.id}`}
                        className="text-sm font-semibold text-teal-800"
                      >
                        {order.company.displayName}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {order.createdBy?.name ??
                          order.createdBy?.email ??
                          "Sistem"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      <p>{order.deliveryCity ?? "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {order.shipment?.carrier ??
                          order.shipmentMethod ??
                          "Planlanmadı"}
                      </p>
                    </td>
                    {canReadPrice ? (
                      <td className="px-5 py-4 text-sm font-semibold">
                        {formatPortalMoney(order.subtotal, order.currency)}
                      </td>
                    ) : null}
                    <td className="px-5 py-4">
                      <PortalStatus status={order.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/siparisler/${order.id}`}
                        aria-label={`${order.orderNumber} detayını aç`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            Filtrelerle eşleşen sipariş bulunamadı.
          </p>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm">
          <p className="text-slate-500">
            {data.total} sipariş · Sayfa {page}/{totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(query, status, page - 1)}
                className="rounded-md border border-slate-300 px-3 py-2 font-semibold"
              >
                Önceki
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={pageHref(query, status, page + 1)}
                className="rounded-md border border-slate-300 px-3 py-2 font-semibold"
              >
                Sonraki
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
