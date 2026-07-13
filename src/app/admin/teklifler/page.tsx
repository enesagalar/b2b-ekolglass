import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Clock3,
  Filter,
  Inbox,
  Search,
} from "lucide-react";

import { getAdminQuotes } from "@/data/admin-quotes";
import { quoteStatuses } from "@/domain/statuses";
import {
  formatPortalDate,
  formatPortalMoney,
  PortalStatus,
} from "@/features/dealer/dealer-ui";
import { requirePermissionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const pageSize = 25;
const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";
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
  return `/admin/teklifler?${params.toString()}`;
}

export default async function AdminQuotesPage({
  searchParams,
}: PageProps<"/admin/teklifler">) {
  await requirePermissionUser("quote.review", "/admin/teklifler");
  const params = await searchParams;
  const query = first(params.q)?.trim() ?? "";
  const status = first(params.status)?.trim() ?? "";
  const requestedPage = Number.parseInt(first(params.page) ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const data = await getAdminQuotes({ query, status, page, pageSize });
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const metrics = [
    { label: "Yeni talepler", value: data.newCount, icon: Inbox, tone: "bg-blue-50 text-blue-800" },
    { label: "Bilgi bekleyen", value: data.waitingCount, icon: Clock3, tone: "bg-amber-50 text-amber-800" },
    { label: "Fiyatlandı / gönderildi", value: data.readyCount, icon: CircleDollarSign, tone: "bg-teal-50 text-teal-800" },
  ];

  return (
    <div className="grid gap-6">
      <section className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-teal-800">Satış operasyonu</p>
        <h2 className="mt-1 text-2xl font-semibold">Teklifler</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Bayi taleplerini kuyruğa alın, kalemleri fiyatlandırın ve müşteri onayına kadar kontrollü biçimde ilerletin.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className={`${panelClass} p-4`}>
              <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-md ${metric.tone}`}><Icon size={19} /></span>
                <strong className="text-2xl">{metric.value}</strong>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">{metric.label}</p>
            </article>
          );
        })}
      </section>

      <section className={`${panelClass} min-w-0 overflow-hidden`}>
        <form className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative">
            <span className="sr-only">Tekliflerde ara</span>
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} />
            <input name="q" defaultValue={query} className={`${inputClass} pl-10`} placeholder="Teklif no, firma veya yetkili" />
          </label>
          <label>
            <span className="sr-only">Teklif durumu</span>
            <select name="status" defaultValue={status} className={inputClass}>
              <option value="">Tüm durumlar</option>
              {quoteStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"><Filter size={16} />Filtrele</button>
        </form>

        {data.quotes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr><th className="px-5 py-3">Teklif</th><th className="px-5 py-3">Firma / yetkili</th><th className="px-5 py-3">Tutar</th><th className="px-5 py-3">Durum</th><th className="px-5 py-3 text-right">İşlem</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4"><p className="font-mono text-sm font-semibold">{quote.quoteNumber}</p><p className="mt-1 text-xs text-slate-500">{formatPortalDate(quote.submittedAt ?? quote.createdAt)} · {quote._count.items} kalem</p></td>
                    <td className="px-5 py-4">{quote.company ? <Link href={`/admin/firmalar/${quote.company.id}`} className="text-sm font-semibold text-teal-800">{quote.company.displayName}</Link> : <p className="text-sm font-semibold">Firma kaydı yok</p>}<p className="mt-1 text-xs text-slate-500">{quote.requesterName} · {quote.requesterEmail}</p></td>
                    <td className="px-5 py-4 text-sm font-semibold">{quote.activeOfferRevision ? formatPortalMoney(quote.activeOfferRevision.subtotal, quote.activeOfferRevision.currency) : quote.estimatedSubtotal ? formatPortalMoney(quote.estimatedSubtotal, quote.currency) : "Fiyat bekliyor"}<p className="mt-1 text-xs font-normal text-slate-500">{quote.activeOfferRevision ? `Revizyon ${quote.activeOfferRevision.revisionNumber}` : "Katalog tahmini"}</p></td>
                    <td className="px-5 py-4"><PortalStatus status={quote.status} /></td>
                    <td className="px-5 py-4 text-right"><Link href={`/admin/teklifler/${quote.id}`} aria-label={`${quote.quoteNumber} detayını aç`} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300"><ArrowRight size={16} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="px-5 py-12 text-center text-sm text-slate-500">Filtrelerle eşleşen teklif bulunamadı.</p>}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm"><p className="text-slate-500">{data.total} teklif · Sayfa {page}/{totalPages}</p><div className="flex gap-2">{page > 1 ? <Link href={pageHref(query, status, page - 1)} className="rounded-md border border-slate-300 px-3 py-2 font-semibold">Önceki</Link> : null}{page < totalPages ? <Link href={pageHref(query, status, page + 1)} className="rounded-md border border-slate-300 px-3 py-2 font-semibold">Sonraki</Link> : null}</div></div>
      </section>
    </div>
  );
}
