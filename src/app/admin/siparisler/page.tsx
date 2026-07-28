import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Filter,
  PackageCheck,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { getAdminOrders } from "@/data/admin-orders";
import {
  adminOrderQueueLabels,
  adminOrderQueueScopes,
  getAdminOrderQueueStatuses,
  getAdminOrderTask,
  resolveAdminOrderQueueScope,
  type AdminOrderQueueScope,
} from "@/domain/admin-order-queue";
import { hasPermission, isKnownRole } from "@/domain/roles";
import { getStatusLabel } from "@/domain/statuses";
import {
  formatPortalDate,
  formatPortalMoney,
  PortalStatus,
} from "@/features/dealer/dealer-ui";
import { requirePermissionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const pageSize = 25;
const panelClass = "min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white";
const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

type OrderQueueFilters = {
  query: string;
  scope: AdminOrderQueueScope;
  status: string;
  manualCityOnly: boolean;
};

const taskTone: Record<string, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  muted: "border-slate-200 bg-slate-50 text-slate-700",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(filters: OrderQueueFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.scope !== "ALL") params.set("view", filters.scope);
  if (filters.status) params.set("status", filters.status);
  if (filters.manualCityOnly) params.set("cityManual", "1");
  params.set("page", String(page));
  return `/admin/siparisler?${params.toString()}`;
}

function queueHref(
  scope: AdminOrderQueueScope,
  filters: Pick<OrderQueueFilters, "query" | "manualCityOnly">,
) {
  const params = new URLSearchParams();
  if (scope !== "ALL") params.set("view", scope);
  if (filters.query) params.set("q", filters.query);
  if (filters.manualCityOnly) params.set("cityManual", "1");
  const query = params.toString();
  return `/admin/siparisler${query ? `?${query}` : ""}`;
}

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/siparisler">) {
  const actor = await requirePermissionUser("order.track", "/admin/siparisler");
  const canReadPrice =
    isKnownRole(actor.role) && hasPermission(actor.role, "price.read");
  const params = await searchParams;
  const query = first(params.q)?.trim() ?? "";
  const scope = resolveAdminOrderQueueScope(first(params.view)?.trim());
  const requestedStatus = first(params.status)?.trim() ?? "";
  const status = getAdminOrderQueueStatuses(scope).some(
    (item) => item === requestedStatus,
  )
    ? requestedStatus
    : "";
  const manualCityOnly = first(params.cityManual) === "1";
  const requestedPage = Number.parseInt(first(params.page) ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const data = await getAdminOrders({
    query,
    scope,
    status,
    manualCityOnly,
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const filters = { query, scope, status, manualCityOnly };
  const hasActiveFilters = Boolean(
    query || scope !== "ALL" || status || manualCityOnly,
  );
  const metrics = [
    {
      label: "İncelenecek",
      value: data.queueCounts.REVIEW,
      detail: "Satış veya ticari karar",
      icon: ClipboardCheck,
      href: queueHref("REVIEW", { query, manualCityOnly }),
    },
    {
      label: "Bekletilen",
      value: data.queueCounts.BLOCKED,
      detail: "Engel veya karar bekliyor",
      icon: Filter,
      href: queueHref("BLOCKED", { query, manualCityOnly }),
    },
    {
      label: "Hazırlık",
      value: data.queueCounts.FULFILLMENT,
      detail: "Depo veya üretim",
      icon: PackageCheck,
      href: queueHref("FULFILLMENT", { query, manualCityOnly }),
    },
    {
      label: "Sevke hazır",
      value: data.queueCounts.READY_TO_SHIP,
      detail: "Taşıyıcı bekliyor",
      icon: Truck,
      href: queueHref("READY_TO_SHIP", { query, manualCityOnly }),
    },
  ];

  return (
    <div className="grid min-w-0 gap-6">
      <section className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-teal-800">Satış operasyonu</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">
          Sipariş kuyruğu
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Önce işlem bekleyen siparişleri görün; firma, teslimat ve ayrılan
          stok ayrıntılarına sipariş kaydından ilerleyin.
        </p>
      </section>

      <section
        aria-label="Sipariş operasyon özeti"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 lg:grid-cols-4"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link
              key={metric.label}
              href={metric.href}
              className="min-w-0 bg-white p-4 transition hover:bg-slate-50 focus-visible:z-10 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Icon className="text-teal-800" size={18} aria-hidden="true" />
                <strong className="text-2xl tabular-nums text-slate-950">
                  {metric.value.toLocaleString("tr-TR")}
                </strong>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                {metric.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {metric.detail}
              </p>
            </Link>
          );
        })}
      </section>

      <section className={panelClass}>
        {manualCityOnly ? (
          <div className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="font-semibold">
                City Lojistik manuel sevkiyat filtresi açık
              </p>
              <p className="mt-1 text-xs leading-5">
                Canlı API açılana kadar taşıyıcı ve takip bilgisini sipariş
                detayından kaydedin.
              </p>
            </div>
            <Link
              href="/admin/siparisler"
              className="inline-flex min-h-11 shrink-0 items-center font-semibold underline underline-offset-4"
            >
              Filtreyi kapat
            </Link>
          </div>
        ) : null}

        <div className="border-b border-slate-200 p-4 sm:p-5">
          <form className="flex flex-col gap-2 sm:flex-row">
            {scope !== "ALL" ? (
              <input type="hidden" name="view" value={scope} />
            ) : null}
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {manualCityOnly ? (
              <input type="hidden" name="cityManual" value="1" />
            ) : null}
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">
                Sipariş, firma, kullanıcı veya takip numarasında ara
              </span>
              <Search
                className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
                size={17}
                aria-hidden="true"
              />
              <input
                name="q"
                defaultValue={query}
                className={`${inputClass} pl-10`}
                placeholder="Sipariş, firma veya takip numarası"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white"
            >
              <Search size={16} aria-hidden="true" />
              Ara
            </button>
          </form>

          <nav
            aria-label="Sipariş iş kuyrukları"
            className="scrollbar-hidden mt-4 flex min-w-0 gap-1 overflow-x-auto"
          >
            {adminOrderQueueScopes.map((item) => {
              const active = scope === item;
              return (
                <Link
                  key={item}
                  href={queueHref(item, { query, manualCityOnly })}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {adminOrderQueueLabels[item]}
                  <span className="tabular-nums text-xs opacity-70">
                    {data.queueCounts[item]}
                  </span>
                </Link>
              );
            })}
          </nav>

          <details
            open={Boolean(status)}
            className="mt-3 border-t border-slate-100 pt-3"
          >
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
              <Filter size={16} aria-hidden="true" />
              Kesin durum filtresi
            </summary>
            <form className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              {query ? <input type="hidden" name="q" value={query} /> : null}
              {scope !== "ALL" ? (
                <input type="hidden" name="view" value={scope} />
              ) : null}
              {manualCityOnly ? (
                <input type="hidden" name="cityManual" value="1" />
              ) : null}
              <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-semibold text-slate-700">
                Sipariş durumu
                <select
                  name="status"
                  defaultValue={status}
                  className={inputClass}
                >
                  <option value="">Tüm durumlar</option>
                  {getAdminOrderQueueStatuses(scope).map((item) => (
                    <option key={item} value={item}>
                      {getStatusLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white"
              >
                <Filter size={16} aria-hidden="true" />
                Uygula
              </button>
              <Link
                href={manualCityOnly ? "/admin/siparisler?cityManual=1" : "/admin/siparisler"}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Temizle
              </Link>
            </form>
          </details>
        </div>

        {data.orders.length ? (
          <>
            <div className="divide-y divide-slate-200 xl:hidden">
              {data.orders.map((order) => {
                const isManualCity =
                  order.shipment?.carrier === "CITY_LOJISTIK" &&
                  order.shipment.status === "AWAITING_MANUAL_DISPATCH";
                const task = getAdminOrderTask(order.status, isManualCity);
                return (
                  <article key={order.id} className="grid gap-4 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/siparisler/${order.id}`}
                          className="break-all font-mono text-sm font-semibold text-teal-900"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatPortalDate(order.submittedAt ?? order.createdAt)}
                          {" · "}
                          {order._count.items} kalem
                        </p>
                      </div>
                      <PortalStatus status={order.status} />
                    </div>

                    <div
                      className={`border-l-2 px-3 py-2 text-sm ${taskTone[task.tone]}`}
                    >
                      <p className="font-semibold">{task.title}</p>
                      <p className="mt-1 text-xs leading-5 opacity-80">
                        {task.detail}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">
                          Firma
                        </p>
                        <Link
                          href={`/admin/firmalar/${order.company.id}`}
                          className="mt-1 block truncate font-semibold text-teal-800"
                        >
                          {order.company.displayName}
                        </Link>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">
                          Teslimat
                        </p>
                        <p className="mt-1 truncate font-semibold text-slate-800">
                          {order.deliveryCity ?? "Şehir belirtilmedi"}
                        </p>
                        {order.requestedDeliveryDate ? (
                          <p className="mt-1 text-xs text-slate-500">
                            İstenen {formatPortalDate(order.requestedDeliveryDate)}
                          </p>
                        ) : null}
                      </div>
                      {canReadPrice ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-500">
                            Sipariş toplamı
                          </p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {formatPortalMoney(order.subtotal, order.currency)}
                          </p>
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">
                          Sevkiyat
                        </p>
                        <p className="mt-1 truncate font-semibold text-slate-800">
                          {order.shipment?.trackingNumber ??
                            order.shipment?.carrier ??
                            order.shipmentMethod ??
                            "Planlanmadı"}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/admin/siparisler/${order.id}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700"
                    >
                      Siparişi aç
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1120px] text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Sipariş</th>
                    <th className="px-5 py-3">Firma / bayi</th>
                    <th className="px-5 py-3">Sıradaki iş</th>
                    <th className="px-5 py-3">Teslimat</th>
                    {canReadPrice ? <th className="px-5 py-3">Tutar</th> : null}
                    <th className="px-5 py-3">Durum</th>
                    <th className="px-5 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.orders.map((order) => {
                    const isManualCity =
                      order.shipment?.carrier === "CITY_LOJISTIK" &&
                      order.shipment.status === "AWAITING_MANUAL_DISPATCH";
                    const task = getAdminOrderTask(order.status, isManualCity);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/siparisler/${order.id}`}
                            className="font-mono text-sm font-semibold text-teal-900"
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatPortalDate(
                              order.submittedAt ?? order.createdAt,
                            )}
                            {" · "}
                            {order._count.items} kalem
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/firmalar/${order.company.id}`}
                            className="text-sm font-semibold text-teal-800"
                          >
                            {order.company.displayName}
                          </Link>
                          <p className="mt-1 max-w-48 truncate text-xs text-slate-500">
                            {order.createdBy?.name ??
                              order.createdBy?.email ??
                              "Sistem"}
                          </p>
                        </td>
                        <td className="max-w-72 px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {task.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {task.detail}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          <p>{order.deliveryCity ?? "-"}</p>
                          {order.requestedDeliveryDate ? (
                            <p className="mt-1 text-xs text-slate-500">
                              İstenen{" "}
                              {formatPortalDate(order.requestedDeliveryDate)}
                            </p>
                          ) : null}
                          <p className="mt-1 max-w-44 truncate text-xs text-slate-500">
                            {order.shipment?.trackingNumber ??
                              order.shipment?.carrier ??
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
                            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 text-slate-700"
                          >
                            <ArrowRight size={16} aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div
            data-testid="admin-order-queue-empty"
            className="px-5 py-14 text-center"
          >
            <Building2
              className="mx-auto text-slate-300"
              size={34}
              aria-hidden="true"
            />
            <p className="mt-4 font-semibold text-slate-800">
              {hasActiveFilters
                ? "Bu iş kuyruğunda sipariş bulunamadı"
                : "Henüz sipariş kaydı yok"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {hasActiveFilters
                ? "Farklı bir iş kuyruğu seçin veya arama metnini temizleyin."
                : "Bayilerden gönderilen siparişler burada işlem sırasına alınır."}
            </p>
            {hasActiveFilters ? (
              <Link
                href="/admin/siparisler"
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white"
              >
                Filtreleri temizle
              </Link>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p
            data-testid="admin-order-pagination"
            data-page={data.page}
            data-total-pages={totalPages}
            className="text-slate-500"
          >
            {data.total.toLocaleString("tr-TR")} sipariş
            {" · "}
            Sayfa {data.page}/{totalPages}
          </p>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <Link
                href={pageHref(filters, data.page - 1)}
                className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-3 font-semibold"
              >
                Önceki
              </Link>
            ) : null}
            {data.page < totalPages ? (
              <Link
                href={pageHref(filters, data.page + 1)}
                className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-3 font-semibold"
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
