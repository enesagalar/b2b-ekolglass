import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  Filter,
  PackageCheck,
  PackageMinus,
  RefreshCw,
  Settings2,
  Upload,
  Warehouse,
} from "lucide-react";

import { getAdminStockReport } from "@/data/admin-stock-reports";
import { resolveStockReportFilters } from "@/domain/stock-reporting";
import { PortalStatus, formatPortalDate } from "@/features/dealer/dealer-ui";
import { StockExportButton } from "@/features/admin/stock-export-button";

const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";
const inputClass = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function queryHref(
  filters: ReturnType<typeof resolveStockReportFilters>,
  page: number,
  basePath: string,
) {
  const query = new URLSearchParams({ page: String(page), sort: filters.sort, productStatus: filters.productStatus });
  if (basePath === "/admin/raporlar") query.set("view", "stock");
  if (filters.q) query.set("q", filters.q);
  if (filters.warehouse) query.set("warehouse", filters.warehouse);
  if (filters.status !== "ALL") query.set("status", filters.status);
  if (filters.availability !== "ALL") query.set("availability", filters.availability);
  return `/admin/raporlar?${query}`;
}

function exportHref(filters: ReturnType<typeof resolveStockReportFilters>) {
  const query = new URLSearchParams({ sort: filters.sort, productStatus: filters.productStatus });
  if (filters.q) query.set("q", filters.q);
  if (filters.warehouse) query.set("warehouse", filters.warehouse);
  if (filters.status !== "ALL") query.set("status", filters.status);
  if (filters.availability !== "ALL") query.set("availability", filters.availability);
  return `/api/admin/reports/stock.csv?${query}`;
}

function formatIstanbulDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export async function StockReportView({
  searchParams,
  canExport,
  basePath = "/admin/raporlar",
  showOperations = false,
}: {
  searchParams: SearchParams;
  canExport: boolean;
  basePath?: string;
  showOperations?: boolean;
}) {
  let filterError: string | null = null;
  let filters;
  try {
    filters = resolveStockReportFilters({
      q: first(searchParams.q),
      warehouse: first(searchParams.warehouse),
      status: first(searchParams.status),
      availability: first(searchParams.availability),
      productStatus: first(searchParams.productStatus),
      sort: first(searchParams.sort),
      page: first(searchParams.page),
    });
  } catch (error) {
    filterError = error instanceof Error ? error.message : "Stok raporu filtresi geçersizdir.";
    filters = resolveStockReportFilters({});
  }
  const report = await getAdminStockReport(filters);
  const metrics = [
    { label: "Fiziksel stok", value: report.metrics.physicalQuantity, detail: `${report.metrics.stockRecordCount} depo kaydı`, icon: Boxes, tone: "bg-blue-50 text-blue-800" },
    { label: "Rezerve", value: report.metrics.reservedQuantity, detail: "Açık siparişlere ayrılan", icon: PackageMinus, tone: "bg-amber-50 text-amber-800" },
    { label: "Kullanılabilir", value: report.metrics.availableQuantity, detail: "Fiziksel stok eksi rezerve", icon: PackageCheck, tone: "bg-emerald-50 text-emerald-800" },
    { label: "Operasyon riski", value: report.metrics.physicalOutCount + report.metrics.fullyReservedCount + report.metrics.lowAvailableCount, detail: `${report.metrics.physicalOutCount} stoksuz · ${report.metrics.fullyReservedCount} tam rezerve · ${report.metrics.lowAvailableCount} düşük`, icon: AlertTriangle, tone: "bg-rose-50 text-rose-800" },
    { label: "Stok teyidi gerekli", value: report.metrics.askForAvailabilityCount, detail: "Manuel kontrol bekleyen", icon: RefreshCw, tone: "bg-slate-100 text-slate-700" },
  ];

  return (
    <>
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-800">Anlık operasyon görünümü</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Stok ve depo raporu</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Ürün ve depo satırlarında fiziksel, rezerve ve kullanılabilir miktarları karşılaştırın. Bu ekran tarihsel stok hareketi değildir.</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">Veri zamanı: {formatIstanbulDateTime(report.snapshotAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showOperations ? (
            <>
              <Link href="/admin/urunler/fiyat-stok-aktarimi" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-800">
                <Upload size={16} /> Toplu stok aktar
              </Link>
              <Link href="/admin/raporlar?view=stock-movements" className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">
                <RefreshCw size={16} /> Hareketleri izle
              </Link>
            </>
          ) : null}
          {canExport ? (
            <StockExportButton
              href={exportHref(filters)}
              disabledReason={report.pagination.totalRows === 0
                ? "İndirilecek kayıt yok."
                : report.pagination.totalRows > 5_000
                  ? "CSV için filtreleri 5.000 satırın altına daraltın."
                  : undefined}
            />
          ) : null}
        </div>
      </section>

      <section className={`${panelClass} p-4`}>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
          {basePath === "/admin/raporlar" ? <input type="hidden" name="view" value="stock" /> : null}
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Ürün ara<input name="q" maxLength={80} defaultValue={filters.q} placeholder="Kod, ürün, marka veya model" className={inputClass} /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Depo<select name="warehouse" defaultValue={filters.warehouse} className={inputClass}><option value="">Tüm depolar</option>{report.warehouses.map((warehouse) => <option key={warehouse}>{warehouse}</option>)}</select></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Operasyon durumu<select name="availability" defaultValue={filters.availability} className={inputClass}><option value="ALL">Tüm operasyon durumları</option><option value="PHYSICAL_OUT">Fiziksel stok yok</option><option value="FULLY_RESERVED">Tamamı rezerve</option><option value="LOW_AVAILABLE">Düşük kullanılabilir</option><option value="AVAILABLE">Kullanılabilir</option></select></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Ürün durumu<select name="productStatus" defaultValue={filters.productStatus} className={inputClass}><option value="ACTIVE">Aktif ürünler</option><option value="DRAFT">Taslak ürünler</option><option value="DISCONTINUED">Satışı durdurulanlar</option></select></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Tanımlı stok durumu<select name="status" defaultValue={filters.status} className={inputClass}><option value="ALL">Tüm tanımlı durumlar</option><option value="IN_STOCK">Stokta</option><option value="LOW_STOCK">Az stok</option><option value="OUT_OF_STOCK">Stok yok</option><option value="ASK_FOR_AVAILABILITY">Stok teyidi gerekli</option><option value="MADE_TO_ORDER">Üretime uygun</option><option value="RESERVED">Rezerve</option></select></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Sıralama<select name="sort" defaultValue={filters.sort} className={inputClass}><option value="AVAILABLE_ASC">Kullanılabilir stok artan</option><option value="UPDATED_DESC">Son güncellenen</option><option value="CODE_ASC">Ürün kodu</option><option value="QUANTITY_ASC">Fiziksel stok artan</option><option value="RESERVED_DESC">Rezerve azalan</option></select></label>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white"><Filter size={16} /> Uygula</button>
        </form>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>Filtreler KPI ve tabloya birlikte uygulanır.</span>
          <Link href={basePath === "/admin/raporlar" ? "/admin/raporlar?view=stock" : basePath} className="font-semibold text-teal-800">Filtreleri temizle</Link>
        </div>
        {filterError ? <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{filterError} Varsayılan görünüm gösteriliyor.</p> : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => { const Icon = metric.icon; return <article key={metric.label} className={`${panelClass} min-w-0 p-4`}><span className={`flex h-9 w-9 items-center justify-center rounded-md ${metric.tone}`}><Icon size={18} /></span><p className="mt-4 text-xs font-semibold text-slate-500">{metric.label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{metric.value.toLocaleString("tr-TR")}</p><p className="mt-2 text-xs leading-5 text-slate-500">{metric.detail}</p></article>; })}
      </section>

      <section className={`${panelClass} min-w-0 overflow-hidden`}>
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center"><div><h3 className="font-semibold text-slate-950">Depo stok kayıtları</h3><p className="mt-1 text-xs text-slate-500">{report.pagination.totalRows.toLocaleString("tr-TR")} filtrelenmiş satır</p></div><Warehouse size={18} className="text-teal-800" /></div>
        {report.metrics.ledgerMismatchCount ? <p role="alert" className="mx-5 mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{report.metrics.ledgerMismatchCount} stok kaydında sayaç, aktif rezervasyon veya hareket defteri mutabakatı bozuk.</p> : null}
        {report.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1240px] text-left text-sm"><caption className="sr-only">Filtrelenmiş ürün ve depo stok kayıtları</caption><thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr><th scope="col" className="px-5 py-3">Ürün</th><th scope="col" className="px-5 py-3">Depo</th><th scope="col" className="px-5 py-3 text-right">Fiziksel</th><th scope="col" className="px-5 py-3 text-right">Rezerve</th><th scope="col" className="px-5 py-3 text-right">Kullanılabilir</th><th scope="col" className="px-5 py-3">Operasyon</th><th scope="col" className="px-5 py-3">Tanımlı durum</th><th scope="col" className="px-5 py-3">Görünürlük</th><th scope="col" className="px-5 py-3">Mutabakat</th><th scope="col" className="px-5 py-3">Güncelleme</th>{showOperations ? <th scope="col" className="px-5 py-3">İşlem</th> : null}</tr></thead><tbody className="divide-y divide-slate-100">{report.rows.map((row) => <tr key={row.id}><td className="px-5 py-4"><Link href={`/admin/urunler/${row.product.id}`} className="font-semibold text-teal-800">{row.product.code}</Link><p className="mt-1 max-w-xs text-xs text-slate-500">{row.product.name}</p></td><td className="px-5 py-4 font-semibold">{row.warehouseCode}</td><td className="px-5 py-4 text-right tabular-nums">{row.quantity}</td><td className="px-5 py-4 text-right tabular-nums">{row.reservedQuantity}</td><td className="px-5 py-4 text-right font-semibold tabular-nums">{row.availableQuantity}</td><td className="px-5 py-4"><span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${row.operationalClass === "AVAILABLE" ? "bg-emerald-50 text-emerald-800" : row.operationalClass === "LOW_AVAILABLE" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}>{row.operationalStatusLabel}</span></td><td className="px-5 py-4"><PortalStatus status={row.status} /></td><td className="px-5 py-4 text-slate-600">{row.visibilityLabel}</td><td className="px-5 py-4">{row.hasLedgerMismatch ? <span className="font-semibold text-red-700">İnceleyin</span> : <span className="font-semibold text-emerald-700">Tutarlı</span>}{row.hasMovementMismatch ? <p className="mt-1 text-xs text-red-600">Hareket: {row.movementPhysicalQuantity} / {row.movementReservedQuantity}</p> : null}</td><td className="px-5 py-4 text-slate-500">{formatPortalDate(row.updatedAt)}</td>{showOperations ? <td className="px-5 py-4"><Link href={`/admin/urunler/${row.product.id}?tab=stok`} className="inline-flex items-center gap-1.5 font-semibold text-teal-800"><Settings2 size={15} /> Düzenle</Link></td> : null}</tr>)}</tbody></table></div> : <div className="px-5 py-14 text-center"><p className="font-semibold text-slate-800">Filtrelerle eşleşen stok kaydı yok</p><Link href={basePath === "/admin/raporlar" ? "/admin/raporlar?view=stock" : basePath} className="mt-2 inline-block text-sm font-semibold text-teal-800">Filtreleri temizle</Link></div>}
        {report.pagination.pageCount > 1 ? <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><span>Sayfa {report.pagination.currentPage} / {report.pagination.pageCount}</span><div className="flex gap-2">{report.pagination.currentPage > 1 ? <Link href={queryHref(filters, report.pagination.currentPage - 1, basePath)} className="rounded-md border border-slate-300 px-3 py-2 font-semibold">Önceki</Link> : null}{report.pagination.currentPage < report.pagination.pageCount ? <Link href={queryHref(filters, report.pagination.currentPage + 1, basePath)} className="rounded-md border border-slate-300 px-3 py-2 font-semibold">Sonraki</Link> : null}</div></div> : null}
      </section>
    </>
  );
}
