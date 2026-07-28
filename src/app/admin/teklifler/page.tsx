import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Filter,
  FolderArchive,
  RotateCcw,
  Search,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";

import { getAdminQuotes } from "@/data/admin-quotes";
import {
  adminQuoteArchiveLabels,
  adminQuoteArchiveScopes,
  getAdminQuoteArchiveStatuses,
  getAdminQuoteArchiveTask,
  resolveAdminQuoteArchiveScope,
  type AdminQuoteArchiveScope,
} from "@/domain/admin-quote-archive";
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
const panelClass =
  "min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white";
const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

type QuoteArchiveFilters = {
  query: string;
  scope: AdminQuoteArchiveScope;
  status: string;
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

function pageHref(filters: QuoteArchiveFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.scope !== "ALL") params.set("view", filters.scope);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(page));
  return `/admin/teklifler?${params.toString()}`;
}

function archiveHref(
  scope: AdminQuoteArchiveScope,
  query: string,
) {
  const params = new URLSearchParams();
  if (scope !== "ALL") params.set("view", scope);
  if (query) params.set("q", query);
  const queryString = params.toString();
  return `/admin/teklifler${queryString ? `?${queryString}` : ""}`;
}

export default async function AdminQuotesPage({
  searchParams,
}: PageProps<"/admin/teklifler">) {
  const actor = await requirePermissionUser(
    "quote.review",
    "/admin/teklifler",
  );
  const canReadPrice =
    isKnownRole(actor.role) && hasPermission(actor.role, "price.read");
  const params = await searchParams;
  const query = first(params.q)?.trim() ?? "";
  const scope = resolveAdminQuoteArchiveScope(first(params.view)?.trim());
  const requestedStatus = first(params.status)?.trim() ?? "";
  const status = getAdminQuoteArchiveStatuses(scope).some(
    (item) => item === requestedStatus,
  )
    ? requestedStatus
    : "";
  const requestedPage = Number.parseInt(first(params.page) ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const data = await getAdminQuotes({
    query,
    scope,
    status,
    includePrices: canReadPrice,
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const filters = { query, scope, status };
  const hasActiveFilters = Boolean(query || scope !== "ALL" || status);
  const metrics = [
    {
      label: "Açık eski kayıtlar",
      detail: "Sonuçlandırılması gereken",
      value: data.scopeCounts.OPEN,
      icon: FolderArchive,
      scope: "OPEN" as const,
    },
    {
      label: "Teklif ve karar",
      detail: "Fiyat veya müşteri kararı",
      value: data.scopeCounts.OFFERED,
      icon: CircleDollarSign,
      scope: "OFFERED" as const,
    },
    {
      label: "Siparişe dönüşen",
      detail: "Sipariş izi bulunan",
      value: data.scopeCounts.CONVERTED,
      icon: ShoppingCart,
      scope: "CONVERTED" as const,
    },
    {
      label: "Kapanan",
      detail: "İptal veya ret ile kapanan",
      value: data.scopeCounts.CLOSED,
      icon: CheckCircle2,
      scope: "CLOSED" as const,
    },
  ];

  return (
    <div className="grid min-w-0 gap-6">
      <section className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-teal-800">
          Geçmiş satış kayıtları
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">
          Teklif arşivi
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Yeni B2B teklif talebi alınmıyor; standart ürünler doğrudan sipariş
          akışına giriyor. Bu ekran yalnız geçmiş tekliflerin fiyat, karar ve
          sipariş dönüşüm izini korur.
        </p>
      </section>

      <section
        aria-label="Teklif arşivi özeti"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 lg:grid-cols-4"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link
              key={metric.scope}
              href={archiveHref(metric.scope, query)}
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
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <form className="flex flex-col gap-2 sm:flex-row">
            {scope !== "ALL" ? (
              <input type="hidden" name="view" value={scope} />
            ) : null}
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">
                Teklif, firma, yetkili veya sipariş numarasında ara
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
                placeholder="Teklif, firma veya sipariş numarası"
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
            aria-label="Teklif arşivi grupları"
            className="scrollbar-hidden mt-4 flex min-w-0 gap-1 overflow-x-auto"
          >
            {adminQuoteArchiveScopes.map((item) => {
              const active = scope === item;
              return (
                <Link
                  key={item}
                  href={archiveHref(item, query)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {adminQuoteArchiveLabels[item]}
                  <span className="tabular-nums text-xs opacity-70">
                    {data.scopeCounts[item]}
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
              <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-semibold text-slate-700">
                Teklif durumu
                <select
                  name="status"
                  defaultValue={status}
                  className={inputClass}
                >
                  <option value="">Tüm durumlar</option>
                  {getAdminQuoteArchiveStatuses(scope).map((item) => (
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
                href="/admin/teklifler"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Temizle
              </Link>
            </form>
          </details>
        </div>

        {data.quotes.length ? (
          <>
            <div className="divide-y divide-slate-200 xl:hidden">
              {data.quotes.map((quote) => {
                const task = getAdminQuoteArchiveTask(
                  quote.status,
                  quote.convertedOrder?.orderNumber,
                );
                return (
                  <article key={quote.id} className="grid gap-4 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/teklifler/${quote.id}`}
                          className="break-all font-mono text-sm font-semibold text-teal-900"
                        >
                          {quote.quoteNumber}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatPortalDate(
                            quote.submittedAt ?? quote.createdAt,
                          )}
                          {" · "}
                          {quote._count.items} kalem
                        </p>
                      </div>
                      <PortalStatus status={quote.status} />
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
                        {quote.company ? (
                          <Link
                            href={`/admin/firmalar/${quote.company.id}`}
                            className="mt-1 block truncate font-semibold text-teal-800"
                          >
                            {quote.company.displayName}
                          </Link>
                        ) : (
                          <p className="mt-1 font-semibold text-slate-800">
                            Firma kaydı yok
                          </p>
                        )}
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {quote.requesterName}
                        </p>
                      </div>
                      {canReadPrice ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-500">
                            Kayıtlı tutar
                          </p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {quote.activeOfferRevision
                              ? formatPortalMoney(
                                  quote.activeOfferRevision.subtotal,
                                  quote.activeOfferRevision.currency,
                                )
                              : quote.estimatedSubtotal
                                ? formatPortalMoney(
                                    quote.estimatedSubtotal,
                                    quote.currency,
                                  )
                                : "Fiyat kaydı yok"}
                          </p>
                        </div>
                      ) : null}
                      <div className="col-span-2 min-w-0">
                        <p className="text-xs font-semibold text-slate-500">
                          Sipariş dönüşümü
                        </p>
                        {quote.convertedOrder ? (
                          <Link
                            href={`/admin/siparisler/${quote.convertedOrder.id}`}
                            className="mt-1 inline-flex font-mono text-sm font-semibold text-teal-800"
                          >
                            {quote.convertedOrder.orderNumber}
                          </Link>
                        ) : (
                          <p className="mt-1 text-slate-600">
                            Sipariş bağlantısı yok
                          </p>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/admin/teklifler/${quote.id}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700"
                    >
                      Arşiv kaydını aç
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
                    <th className="px-5 py-3">Teklif</th>
                    <th className="px-5 py-3">Firma / yetkili</th>
                    <th className="px-5 py-3">Kayıt durumu</th>
                    <th className="px-5 py-3">Sipariş izi</th>
                    {canReadPrice ? <th className="px-5 py-3">Tutar</th> : null}
                    <th className="px-5 py-3">Durum</th>
                    <th className="px-5 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.quotes.map((quote) => {
                    const task = getAdminQuoteArchiveTask(
                      quote.status,
                      quote.convertedOrder?.orderNumber,
                    );
                    return (
                      <tr key={quote.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/teklifler/${quote.id}`}
                            className="font-mono text-sm font-semibold text-teal-900"
                          >
                            {quote.quoteNumber}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatPortalDate(
                              quote.submittedAt ?? quote.createdAt,
                            )}
                            {" · "}
                            {quote._count.items} kalem
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {quote.company ? (
                            <Link
                              href={`/admin/firmalar/${quote.company.id}`}
                              className="text-sm font-semibold text-teal-800"
                            >
                              {quote.company.displayName}
                            </Link>
                          ) : (
                            <p className="text-sm font-semibold">
                              Firma kaydı yok
                            </p>
                          )}
                          <p className="mt-1 max-w-48 truncate text-xs text-slate-500">
                            {quote.requesterName} · {quote.requesterEmail}
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
                        <td className="px-5 py-4">
                          {quote.convertedOrder ? (
                            <Link
                              href={`/admin/siparisler/${quote.convertedOrder.id}`}
                              className="font-mono text-sm font-semibold text-teal-800"
                            >
                              {quote.convertedOrder.orderNumber}
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-500">
                              Bağlantı yok
                            </span>
                          )}
                        </td>
                        {canReadPrice ? (
                          <td className="px-5 py-4 text-sm font-semibold">
                            {quote.activeOfferRevision
                              ? formatPortalMoney(
                                  quote.activeOfferRevision.subtotal,
                                  quote.activeOfferRevision.currency,
                                )
                              : quote.estimatedSubtotal
                                ? formatPortalMoney(
                                    quote.estimatedSubtotal,
                                    quote.currency,
                                  )
                                : "Fiyat kaydı yok"}
                          </td>
                        ) : null}
                        <td className="px-5 py-4">
                          <PortalStatus status={quote.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/teklifler/${quote.id}`}
                            aria-label={`${quote.quoteNumber} arşiv kaydını aç`}
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
            data-testid="admin-quote-archive-empty"
            className="px-5 py-14 text-center"
          >
            <FolderArchive
              className="mx-auto text-slate-300"
              size={34}
              aria-hidden="true"
            />
            <p className="mt-4 font-semibold text-slate-800">
              {hasActiveFilters
                ? "Bu arşiv grubunda kayıt bulunamadı"
                : "Henüz geçmiş teklif kaydı yok"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {hasActiveFilters
                ? "Farklı bir arşiv grubu seçin veya arama metnini temizleyin."
                : "Yeni satışlar sipariş akışından ilerler; geçmiş teklifler burada korunur."}
            </p>
            {hasActiveFilters ? (
              <Link
                href="/admin/teklifler"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-teal-800 px-5 text-sm font-semibold text-white"
              >
                Filtreleri temizle
              </Link>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p
            data-testid="admin-quote-pagination"
            data-page={data.page}
            data-total-pages={totalPages}
            className="text-slate-500"
          >
            {data.total.toLocaleString("tr-TR")} teklif
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
