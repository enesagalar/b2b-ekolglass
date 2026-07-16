import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Filter,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

import { getAdminSalesReport } from "@/data/admin-reports";
import {
  formatReportDateInput,
  resolveReportPeriod,
} from "@/domain/reporting";
import { getStatusLabel } from "@/domain/statuses";
import {
  formatPortalMoney,
  PortalStatus,
} from "@/features/dealer/dealer-ui";
import { requirePermissionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";
const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function presetHref(days: number, currency: string) {
  const current = resolveReportPeriod({});
  const from = new Date(current.toInclusive.getTime() - (days - 1) * 86_400_000);
  return `/admin/raporlar?from=${formatReportDateInput(from)}&to=${current.toInput}&currency=${currency}`;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

export default async function AdminReportsPage({
  searchParams,
}: PageProps<"/admin/raporlar">) {
  await requirePermissionUser("report.read", "/admin/raporlar");
  const params = await searchParams;
  let filterError: string | null = null;
  let period;
  try {
    period = resolveReportPeriod({
      from: first(params.from),
      to: first(params.to),
      currency: first(params.currency),
    });
  } catch (error) {
    filterError = error instanceof Error ? error.message : "Rapor filtresi geçersiz.";
    period = resolveReportPeriod({});
  }
  const report = await getAdminSalesReport(period);
  const trendChunkSize = period.rangeDays > 180 ? 30 : period.rangeDays > 60 ? 7 : 1;
  const trend = report.daily.reduce<typeof report.daily>((buckets, item, index) => {
    if (index % trendChunkSize === 0) {
      buckets.push({ ...item });
      return buckets;
    }
    const bucket = buckets.at(-1)!;
    bucket.count += item.count;
    bucket.value = bucket.value.add(item.value);
    return buckets;
  }, []);
  const maxDailyValue = trend.reduce(
    (max, item) => Math.max(max, Number(item.value)),
    0,
  );
  const maxStatusCount = Math.max(1, ...report.statuses.map((item) => item.count));
  const metrics = [
    {
      label: "Güncel net sipariş değeri",
      value: formatPortalMoney(report.metrics.submittedValue, period.currency),
      detail: `${report.metrics.submittedCount} iptal edilmemiş sipariş`,
      icon: ReceiptText,
      tone: "bg-teal-50 text-teal-800",
    },
    {
      label: "Teslim edilen değer",
      value: formatPortalMoney(report.metrics.deliveredValue, period.currency),
      detail: `${report.metrics.deliveredCount} dönemde teslim`,
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-800",
    },
    {
      label: "Ortalama sipariş",
      value: formatPortalMoney(report.metrics.averageOrderValue, period.currency),
      detail: "İptal edilenler hariç",
      icon: TrendingUp,
      tone: "bg-blue-50 text-blue-800",
    },
    {
      label: "İptal etkisi",
      value: formatPortalMoney(report.metrics.cancelledValue, period.currency),
      detail: `${report.metrics.cancelledCount} dönemde gerçekleşen iptal`,
      icon: AlertTriangle,
      tone: "bg-rose-50 text-rose-800",
    },
    {
      label: "Ticari inceleme",
      value: String(report.metrics.commercialReviewCount),
      detail: "Dönemde halen karar bekleyen",
      icon: ClipboardList,
      tone: "bg-amber-50 text-amber-800",
    },
  ];

  return (
    <div className="grid gap-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-800">Ticari performans</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Satış ve sipariş raporları</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Sipariş talebini, teslim edilen operasyon değerini ve bayi dağılımını tek para biriminde karşılaştırın. Bu ekran fatura veya tahsilat cirosu değildir.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <CalendarRange size={17} />
          {period.rangeDays} günlük dönem · {period.currency}
        </div>
      </section>

      <section className={`${panelClass} p-4`}>
        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_auto] lg:items-end">
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Başlangıç
            <input type="date" name="from" defaultValue={period.fromInput} className={inputClass} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Bitiş
            <input type="date" name="to" defaultValue={period.toInput} className={inputClass} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Para birimi
            <select name="currency" defaultValue={period.currency} className={inputClass}>
              {report.currencies.map((currency) => <option key={currency}>{currency}</option>)}
            </select>
          </label>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">
            <Filter size={16} /> Uygula
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {[7, 30, 90].map((days) => (
            <Link key={days} href={presetHref(days, period.currency)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-800">
              Son {days} gün
            </Link>
          ))}
        </div>
        {filterError ? <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{filterError} Varsayılan 30 günlük dönem gösteriliyor.</p> : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className={`${panelClass} min-w-0 p-4`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-md ${metric.tone}`}><Icon size={18} /></span>
              <p className="mt-4 text-xs font-semibold text-slate-500">{metric.label}</p>
              <p className="mt-1 break-words text-xl font-semibold text-slate-950">{metric.value}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{metric.detail}</p>
            </article>
          );
        })}
      </section>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h3 className="font-semibold text-slate-950">Günlük sipariş talebi</h3><p className="mt-1 text-xs text-slate-500">İptal edilen siparişler hariç · gönderim tarihi</p></div>
          <Banknote size={18} className="text-teal-800" />
        </div>
        {report.metrics.submittedCount ? (
          <div className="overflow-x-auto px-5 py-5">
            <div className="flex h-52 min-w-[640px] items-end gap-2 border-b border-slate-200" role="img" aria-label={`Seçili dönemdeki ${period.currency} sipariş talebi grafiği`}>
              {trend.map((item, index) => {
                const height = maxDailyValue ? Math.max(8, (Number(item.value) / maxDailyValue) * 170) : 8;
                const endItem = report.daily[Math.min(report.daily.length - 1, index * trendChunkSize + trendChunkSize - 1)];
                const dateLabel = trendChunkSize === 1
                  ? shortDate(item.date)
                  : `${shortDate(item.date)} - ${shortDate(endItem.date)}`;
                return (
                  <div key={item.date} className="group flex min-w-8 flex-1 flex-col items-center justify-end gap-2" tabIndex={0} aria-label={`${dateLabel}: ${formatPortalMoney(item.value, period.currency)}, ${item.count} sipariş`}>
                    <div className="w-full rounded-t bg-teal-700 transition group-hover:bg-teal-900" style={{ height }} />
                    <span className="text-[10px] text-slate-500">{dateLabel}</span>
                  </div>
                );
              })}
            </div>
            <table className="sr-only">
              <caption>Günlük sipariş talebi verileri</caption>
              <thead><tr><th scope="col">Tarih</th><th scope="col">Sipariş</th><th scope="col">Değer</th></tr></thead>
              <tbody>{report.daily.map((item) => <tr key={item.date}><td>{item.date}</td><td>{item.count}</td><td>{formatPortalMoney(item.value, period.currency)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="px-5 py-12 text-center text-sm text-slate-500">Seçili dönemde sipariş talebi bulunmuyor.</p>}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className={`${panelClass} overflow-hidden`}>
          <div className="border-b border-slate-200 px-5 py-4"><h3 className="font-semibold">Bayi performansı</h3><p className="mt-1 text-xs text-slate-500">İptal edilmeyen sipariş talep değerine göre ilk 10 firma</p></div>
          {report.companies.length ? (
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr><th scope="col" className="px-5 py-3">Firma</th><th scope="col" className="px-5 py-3">Sipariş</th><th scope="col" className="px-5 py-3 text-right">Talep değeri</th></tr></thead><tbody className="divide-y divide-slate-100">{report.companies.map((company) => <tr key={company.companyId}><td className="px-5 py-4"><Link href={`/admin/firmalar/${company.companyId}`} className="text-sm font-semibold text-teal-800">{company.companyName}</Link></td><td className="px-5 py-4 text-sm">{company.count}</td><td className="px-5 py-4 text-right text-sm font-semibold">{formatPortalMoney(company.value, period.currency)}</td></tr>)}</tbody></table></div>
          ) : <p className="px-5 py-12 text-center text-sm text-slate-500">Bayi performans verisi bulunmuyor.</p>}
        </section>

        <section className={`${panelClass} overflow-hidden`}>
          <div className="border-b border-slate-200 px-5 py-4"><h3 className="font-semibold">Durum dağılımı</h3><p className="mt-1 text-xs text-slate-500">Dönemde gönderilen tüm siparişler</p></div>
          {report.statuses.length ? <div className="grid gap-4 p-5">{report.statuses.map((item) => <div key={item.status}><div className="flex items-center justify-between gap-3"><PortalStatus status={item.status} /><span className="text-sm font-semibold">{item.count}</span></div><div className="mt-2 h-2 overflow-hidden rounded bg-slate-100"><div className="h-full rounded bg-slate-700" style={{ width: `${Math.max(5, (item.count / maxStatusCount) * 100)}%` }} /></div><div className="mt-1 flex justify-between text-xs text-slate-500"><span>{getStatusLabel(item.status)}</span><span>{formatPortalMoney(item.value, period.currency)}</span></div></div>)}</div> : <p className="px-5 py-12 text-center text-sm text-slate-500">Durum dağılımı bulunmuyor.</p>}
        </section>
      </div>
    </div>
  );
}
