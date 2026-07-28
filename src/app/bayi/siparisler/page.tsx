import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Filter,
  PackageCheck,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { requireDealerContext } from "@/data/dealer-context";
import {
  dealerOrderStatuses,
  getDealerOrders,
} from "@/data/dealer-portal";
import {
  dealerOrderScopeLabels,
  dealerOrderScopes,
  getDealerOrderJourney,
  resolveDealerOrderDateRange,
  resolveDealerOrderScope,
  type DealerOrderScope,
} from "@/domain/dealer-order-journey";
import { getStatusLabel } from "@/domain/statuses";
import {
  formatPortalDate,
  formatPortalMoney,
  PortalStatus,
} from "@/features/dealer/dealer-ui";

export const dynamic = "force-dynamic";

const pageSize = 20;
const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type OrderListFilters = {
  query: string;
  scope: DealerOrderScope;
  status: string;
  dateFrom: string;
  dateTo: string;
};

function pageHref(filters: OrderListFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.scope !== "ALL") params.set("view", filters.scope);
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  params.set("page", String(page));
  return `/bayi/siparisler?${params.toString()}`;
}

function scopeHref(
  scope: DealerOrderScope,
  filters: Omit<OrderListFilters, "scope" | "status">,
) {
  const params = new URLSearchParams();
  if (scope !== "ALL") params.set("view", scope);
  if (filters.query) params.set("q", filters.query);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const query = params.toString();
  return `/bayi/siparisler${query ? `?${query}` : ""}`;
}

const journeyTone: Record<string, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  muted: "border-slate-200 bg-slate-50 text-slate-700",
};

export default async function DealerOrdersPage({
  searchParams,
}: PageProps<"/bayi/siparisler">) {
  const { company } = await requireDealerContext("/bayi/siparisler");
  const params = await searchParams;
  const query = first(params.q)?.trim() ?? "";
  const scope = resolveDealerOrderScope(first(params.view)?.trim());
  const requestedStatus = first(params.status)?.trim() ?? "";
  const status = dealerOrderStatuses.some(
    (item) => item === requestedStatus,
  )
    ? requestedStatus
    : "";
  const dateRange = resolveDealerOrderDateRange({
    dateFrom: first(params.dateFrom),
    dateTo: first(params.dateTo),
  });
  const requestedPage = Number.parseInt(first(params.page) ?? "1", 10);
  const requestedPageNumber =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const data = await getDealerOrders(company.id, {
    query,
    scope,
    status,
    dateFrom: dateRange.error ? undefined : (dateRange.from ?? undefined),
    dateTo: dateRange.error ? undefined : dateRange.toExclusive,
    page: requestedPageNumber,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const page = data.page;
  const filters = {
    query,
    scope,
    status,
    dateFrom: dateRange.dateFromInput,
    dateTo: dateRange.dateToInput,
  };
  const hasActiveFilters = Boolean(
    query ||
      scope !== "ALL" ||
      status ||
      dateRange.dateFromInput ||
      dateRange.dateToInput,
  );

  return (
    <div className="grid min-w-0 gap-6">
      <section className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-800">
            {company.displayName}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">
            Siparişlerim
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Siparişinizin hangi aşamada olduğunu, sıradaki operasyon adımını
            ve sevkiyat bilgisini tek yerden izleyin.
          </p>
        </div>
        <Link
          href="/urunler"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <PackageCheck size={17} aria-hidden="true" />
          Yeni sipariş oluştur
        </Link>
      </section>

      <section
        aria-label="Sipariş operasyon özeti"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4"
      >
        {[
          {
            label: "İncelemede",
            value: data.scopeCounts.REVIEW,
            detail: "Satış veya ticari kontrol",
          },
          {
            label: "Hazırlanıyor",
            value: data.scopeCounts.PREPARING,
            detail: "Onay, depo veya üretim",
          },
          {
            label: "Yolda",
            value: data.scopeCounts.IN_TRANSIT,
            detail: "Sevk edilen sipariş",
          },
          {
            label: "Geçmiş",
            value: data.scopeCounts.COMPLETED,
            detail: "Teslim veya iptal",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="min-w-0 bg-white p-4 sm:min-h-28"
          >
            <p className="text-xs font-semibold text-slate-500">
              {metric.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
              {metric.value.toLocaleString("tr-TR")}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {metric.detail}
            </p>
          </div>
        ))}
      </section>

      <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <form className="flex flex-col gap-2 sm:flex-row">
            {scope !== "ALL" ? (
              <input type="hidden" name="view" value={scope} />
            ) : null}
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {dateRange.dateFromInput ? (
              <input
                type="hidden"
                name="dateFrom"
                value={dateRange.dateFromInput}
              />
            ) : null}
            {dateRange.dateToInput ? (
              <input
                type="hidden"
                name="dateTo"
                value={dateRange.dateToInput}
              />
            ) : null}
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">
                Sipariş veya takip numarasında ara
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
                placeholder="Sipariş veya takip numarası"
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
            aria-label="Sipariş operasyon aşamaları"
            className="scrollbar-hidden mt-4 flex min-w-0 gap-1 overflow-x-auto"
          >
            {dealerOrderScopes.map((item) => {
              const active = scope === item && !status;
              return (
                <Link
                  key={item}
                  href={scopeHref(item, {
                    query,
                    dateFrom: dateRange.dateFromInput,
                    dateTo: dateRange.dateToInput,
                  })}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {dealerOrderScopeLabels[item]}
                  <span className="tabular-nums text-xs opacity-70">
                    {data.scopeCounts[item]}
                  </span>
                </Link>
              );
            })}
          </nav>

          <details
            open={Boolean(
              status || dateRange.dateFromInput || dateRange.dateToInput,
            )}
            className="mt-3 border-t border-slate-100 pt-3"
          >
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
              <Filter size={16} aria-hidden="true" />
              Durum ve tarih filtresi
            </summary>
            <form className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_170px_170px_auto_auto] lg:items-end">
              {query ? <input type="hidden" name="q" value={query} /> : null}
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                Kesin durum
                <select
                  name="status"
                  defaultValue={status}
                  className={inputClass}
                >
                  <option value="">Tüm durumlar</option>
                  {dealerOrderStatuses.map((item) => (
                    <option key={item} value={item}>
                      {getStatusLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                Başlangıç
                <input
                  type="date"
                  name="dateFrom"
                  defaultValue={dateRange.dateFromInput}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                Bitiş
                <input
                  type="date"
                  name="dateTo"
                  defaultValue={dateRange.dateToInput}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
              >
                <CalendarDays size={16} aria-hidden="true" />
                Uygula
              </button>
              <Link
                href="/bayi/siparisler"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Temizle
              </Link>
            </form>
          </details>

          {dateRange.error ? (
            <p
              role="alert"
              className="mt-3 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700"
            >
              <AlertTriangle size={16} aria-hidden="true" />
              {dateRange.error} Tarih filtresi uygulanmadı.
            </p>
          ) : null}
        </div>

        {data.orders.length ? (
          <div className="divide-y divide-slate-200">
            {data.orders.map((order) => {
              const journey = getDealerOrderJourney(
                order.status,
                order.shipment?.trackingNumber,
              );
              return (
                <article
                  key={order.id}
                  className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.9fr)_180px_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/bayi/siparisler/${order.id}`}
                        className="break-all font-semibold text-teal-900 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <PortalStatus status={order.status} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatPortalDate(order.createdAt)}
                      {" · "}
                      {order._count.items} kalem
                      {order.requestedDeliveryDate
                        ? ` · İstenen teslim ${formatPortalDate(order.requestedDeliveryDate)}`
                        : ""}
                    </p>
                  </div>

                  <div
                    className={`min-w-0 border-l-2 px-3 py-2 text-sm ${journeyTone[journey.tone]}`}
                  >
                    <p className="font-semibold">{journey.title}</p>
                    <p className="mt-1 text-xs leading-5 opacity-80">
                      {journey.detail}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500">
                      Sipariş toplamı
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatPortalMoney(order.subtotal, order.currency)}
                    </p>
                    {order.shipment?.carrier ? (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {order.shipment.carrier}
                      </p>
                    ) : null}
                  </div>

                  <Link
                    href={`/bayi/siparisler/${order.id}`}
                    aria-label={`${order.orderNumber} siparişini incele`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-900"
                  >
                    İncele
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <ClipboardList
              className="mx-auto text-slate-300"
              size={34}
              aria-hidden="true"
            />
            <h3 className="mt-4 text-base font-semibold text-slate-950">
              {hasActiveFilters
                ? "Bu ölçütlerde sipariş bulunamadı"
                : "Henüz siparişiniz yok"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {hasActiveFilters
                ? "Arama metnini veya operasyon aşamasını değiştirerek yeniden deneyin."
                : "Ürünleri inceleyip sepetinizi gönderdiğinizde sipariş süreci burada başlayacak."}
            </p>
            <Link
              href={hasActiveFilters ? "/bayi/siparisler" : "/urunler"}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white"
            >
              {hasActiveFilters ? "Filtreleri temizle" : "Ürünleri incele"}
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-slate-500">
            {data.total.toLocaleString("tr-TR")} sipariş
            {" · "}
            Sayfa {page}/{totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(filters, page - 1)}
                className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-3 font-semibold"
              >
                Önceki
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={pageHref(filters, page + 1)}
                className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-3 font-semibold"
              >
                Sonraki
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">
        <Truck
          className="mt-0.5 shrink-0 text-teal-800"
          size={18}
          aria-hidden="true"
        />
        <p>
          Taşıyıcı tarafından doğrulanan takip numarası geldiğinde gönderi
          bilgisi ilgili siparişe otomatik eklenir.
        </p>
      </div>
    </div>
  );
}
