import { ArrowLeft, ArrowRight, Filter, History } from "lucide-react";
import Link from "next/link";

import { getAdminStockMovements } from "@/data/admin-stock-movements";

const inputClass = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700";
const movementLabels: Record<string, string> = {
  OPENING_BALANCE: "Açılış bakiyesi",
  INITIAL_STOCK: "İlk stok",
  MANUAL_ADJUSTMENT: "Manuel düzeltme",
  CSV_IMPORT: "CSV aktarımı",
  ORDER_RESERVATION: "Sipariş rezervasyonu",
  ORDER_RELEASE: "Rezervasyon bırakma",
  ORDER_CONSUME: "Sevk tüketimi",
};
const sourceLabels: Record<string, string> = {
  CATALOG_IMPORT_BATCH: "Fiyat / stok CSV aktarımı",
  DATABASE_SEED: "Başlangıç verisi",
  MANUAL: "Manuel düzenleme",
  MIGRATION: "Migration açılış kaydı",
  ORDER: "Bayi siparişi",
  ORDER_TRANSITION: "Sipariş durum geçişi",
  PRODUCT_BUNDLE: "Ürün kaydı",
  QUOTE_CONVERSION_ORDER: "Tekliften sipariş dönüşümü",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | undefined, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return end ? new Date(date.getTime() + 86_400_000) : date;
}

function pageHref(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  next.set("view", "stock-movements");
  next.set("page", String(page));
  return `/admin/raporlar?${next.toString()}`;
}

export async function StockMovementReportView({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const page = Math.max(1, Number(first(searchParams.page) ?? 1) || 1);
  const filters = {
    q: first(searchParams.q)?.trim() ?? "",
    warehouse: first(searchParams.warehouse) ?? "",
    movementType: first(searchParams.movementType) ?? "",
    sourceType: first(searchParams.sourceType) ?? "",
    from: parseDate(first(searchParams.from)),
    toExclusive: parseDate(first(searchParams.to), true),
    page,
  };
  const report = await getAdminStockMovements(filters);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const item = Array.isArray(value) ? value[0] : value;
    if (item) query.set(key, item);
  }

  return (
    <div className="grid gap-5">
      <section className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div><p className="text-sm font-semibold text-teal-800">Stok izlenebilirliği</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Stok hareket defteri</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Fiziksel ve rezerve bakiye değişikliklerini kaynak, aktör ve önce/sonra değerleriyle izleyin.</p></div>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><History size={18} />{report.totalRows} hareket</div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-6 lg:items-end">
          <input type="hidden" name="view" value="stock-movements" />
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700 lg:col-span-2">Ürün veya kaynak<input name="q" defaultValue={filters.q} className={inputClass} /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Depo<select name="warehouse" defaultValue={filters.warehouse} className={inputClass}><option value="">Tüm depolar</option>{report.warehouses.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Hareket<select name="movementType" defaultValue={filters.movementType} className={inputClass}><option value="">Tüm hareketler</option>{report.movementTypes.map((value) => <option key={value} value={value}>{movementLabels[value] ?? value}</option>)}</select></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Kaynak<select name="sourceType" defaultValue={filters.sourceType} className={inputClass}><option value="">Tüm kaynaklar</option>{report.sourceTypes.map((value) => <option key={value} value={value}>{sourceLabels[value] ?? value}</option>)}</select></label>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"><Filter size={16} />Uygula</button>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Başlangıç<input type="date" name="from" defaultValue={first(searchParams.from)} className={inputClass} /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Bitiş<input type="date" name="to" defaultValue={first(searchParams.to)} className={inputClass} /></label>
          <Link href="/admin/raporlar?view=stock-movements" className="text-sm font-semibold text-teal-800 lg:col-span-4">Filtreleri temizle</Link>
        </form>
      </section>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {report.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1240px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr><th className="px-4 py-3">Tarih</th><th className="px-4 py-3">Ürün / depo</th><th className="px-4 py-3">Hareket</th><th className="px-4 py-3 text-right">Fiziksel</th><th className="px-4 py-3 text-right">Rezerve</th><th className="px-4 py-3">Kaynak</th><th className="px-4 py-3">Aktör / gerekçe</th></tr></thead><tbody className="divide-y divide-slate-100">{report.rows.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-4 py-4 text-slate-500">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(row.createdAt)}</td><td className="px-4 py-4"><Link href={`/admin/urunler/${row.productId}`} className="font-semibold text-teal-800">{row.productCode}</Link><p className="mt-1 text-xs text-slate-500">{row.warehouseCode} · #{row.sequence}</p></td><td className="px-4 py-4 font-semibold">{movementLabels[row.movementType] ?? row.movementType}</td><td className="px-4 py-4 text-right tabular-nums"><span className={row.physicalDelta < 0 ? "text-red-700" : row.physicalDelta > 0 ? "text-emerald-700" : "text-slate-500"}>{row.physicalDelta > 0 ? "+" : ""}{row.physicalDelta}</span><p className="mt-1 text-xs text-slate-500">{row.beforeQuantity} → {row.afterQuantity}</p></td><td className="px-4 py-4 text-right tabular-nums"><span className={row.reservedDelta < 0 ? "text-red-700" : row.reservedDelta > 0 ? "text-amber-700" : "text-slate-500"}>{row.reservedDelta > 0 ? "+" : ""}{row.reservedDelta}</span><p className="mt-1 text-xs text-slate-500">{row.beforeReservedQuantity} → {row.afterReservedQuantity}</p></td><td className="px-4 py-4"><span className="font-semibold">{sourceLabels[row.sourceType] ?? row.sourceType}</span><p className="mt-1 max-w-56 truncate text-xs text-slate-500" title={row.sourceId}>{row.sourceId}</p></td><td className="px-4 py-4"><span className="font-semibold">{row.actorName}</span><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{row.reason}</p></td></tr>)}</tbody></table></div> : <p className="px-5 py-14 text-center text-sm text-slate-500">Filtrelerle eşleşen stok hareketi yok.</p>}
      </section>
      <nav className="flex items-center justify-between"><Link aria-disabled={page <= 1} href={pageHref(query, Math.max(1, page - 1))} className={`inline-flex items-center gap-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none text-slate-300" : "text-teal-800"}`}><ArrowLeft size={16} />Önceki</Link><span className="text-sm text-slate-500">{Math.min(page, report.pageCount)} / {report.pageCount}</span><Link aria-disabled={page >= report.pageCount} href={pageHref(query, Math.min(report.pageCount, page + 1))} className={`inline-flex items-center gap-2 text-sm font-semibold ${page >= report.pageCount ? "pointer-events-none text-slate-300" : "text-teal-800"}`}>Sonraki<ArrowRight size={16} /></Link></nav>
    </div>
  );
}
