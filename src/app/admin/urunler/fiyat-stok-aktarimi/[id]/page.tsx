import { AlertTriangle, CheckCircle2, Clock3, FileSpreadsheet, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PendingSubmitButton } from "@/components/pending-submit-button";
import { applyPriceStockImportBatch, cancelPriceStockImportBatch } from "@/features/catalog-management/price-stock-import-actions";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function param(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
export default async function PriceStockImportPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePermissionUser("price.manage", "/admin/urunler/fiyat-stok-aktarimi"); await requirePermissionUser("stock.manage", "/admin/urunler/fiyat-stok-aktarimi");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const batch = await prisma.catalogImportBatch.findFirst({ where: { id, createdById: actor.id }, include: { priceList: true, rows: { orderBy: { rowNumber: "asc" } } } });
  if (!batch) notFound();
  const isExpired = batch.expiresAt <= new Date(); const canApply = batch.status === "PREVIEW" && !isExpired && batch.invalidRows === 0;
  const apply = applyPriceStockImportBatch.bind(null, batch.id); const cancel = cancelPriceStockImportBatch.bind(null, batch.id);
  return <div className="grid gap-6"><header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-semibold text-teal-800">Aktarım önizlemesi</p><h1 className="mt-2 break-all text-2xl font-semibold text-slate-950">{batch.fileName}</h1><p className="mt-2 text-sm text-slate-600">{batch.priceList.name} ({batch.priceList.currency})</p></div><Link href="/admin/urunler/fiyat-stok-aktarimi" className="text-sm font-semibold text-slate-600 hover:text-slate-950">Aktarım merkezine dön</Link></header>
  {param(query.error) ? <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900"><AlertTriangle size={18}/>{param(query.error)}</div> : null}{param(query.success) ? <div className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 size={18}/>{param(query.success)}</div> : null}
  <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{label:"Toplam satır",value:batch.totalRows,icon:FileSpreadsheet},{label:"Geçerli",value:batch.validRows,icon:CheckCircle2},{label:"Hatalı",value:batch.invalidRows,icon:XCircle},{label:"Durum",value:isExpired&&batch.status==="PREVIEW"?"Süresi doldu":({PREVIEW:"Onay bekliyor",APPLIED:"Uygulandı",CANCELLED:"İptal edildi"}[batch.status]??batch.status),icon:Clock3}].map(item=><article key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><item.icon size={18} className="text-teal-800"/><p className="mt-4 text-xs font-semibold text-slate-500">{item.label}</p><p className="mt-1 text-lg font-semibold text-slate-950">{item.value}</p></article>)}</section>
  {batch.invalidRows ? <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Onay kapalı.</strong> Hatalı satırları kaynak dosyada düzeltip yeni bir parti yükleyin. Bu önizleme canlı veriyi değiştirmedi.</div> : null}
  <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="divide-y divide-slate-100 lg:hidden">
      {batch.rows.map((row) => (
        <article key={row.id} className={row.status === "INVALID" ? "bg-red-50/60 p-4" : "p-4"}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Satır {row.rowNumber}</p>
              <p className="mt-1 break-all font-semibold text-slate-950">{row.productCode}</p>
            </div>
            <span className={row.status === "VALID" ? "text-xs font-semibold text-emerald-700" : "text-xs font-semibold text-red-800"}>
              {row.errorMessage ?? "Geçerli"}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><dt className="text-xs text-slate-500">Net fiyat</dt><dd className="mt-1 font-semibold text-slate-900">{row.netPrice?.toString() ?? "-"} {batch.priceList.currency}</dd></div>
            <div><dt className="text-xs text-slate-500">Fiziksel stok</dt><dd className="mt-1 font-semibold text-slate-900">{row.stockQuantity ?? "-"}</dd></div>
            <div><dt className="text-xs text-slate-500">Depo</dt><dd className="mt-1 font-medium text-slate-800">{row.warehouseCode ?? "-"}</dd></div>
            <div><dt className="text-xs text-slate-500">Bayi görünümü</dt><dd className="mt-1 font-medium text-slate-800">{{HIDDEN:"Gizli",SIMPLIFIED:"Sade",DETAILED:"Detaylı"}[row.stockVisibility??""]??"-"}</dd></div>
          </dl>
        </article>
      ))}
    </div>
    <div className="hidden overflow-x-auto lg:block"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="px-4 py-3">Satır</th><th className="px-4 py-3">Ürün</th><th className="px-4 py-3">Net fiyat</th><th className="px-4 py-3">Stok</th><th className="px-4 py-3">Depo</th><th className="px-4 py-3">Görünürlük</th><th className="px-4 py-3">Kontrol</th></tr></thead><tbody className="divide-y divide-slate-100">{batch.rows.map(row=><tr key={row.id} className={row.status==="INVALID"?"bg-red-50/60":""}><td className="px-4 py-3 text-slate-500">{row.rowNumber}</td><td className="px-4 py-3 font-semibold text-slate-900">{row.productCode}</td><td className="px-4 py-3">{row.netPrice?.toString() ?? "-"} {batch.priceList.currency}</td><td className="px-4 py-3">{row.stockQuantity ?? "-"}</td><td className="px-4 py-3">{row.warehouseCode ?? "-"}</td><td className="px-4 py-3">{{HIDDEN:"Gizli",SIMPLIFIED:"Sade",DETAILED:"Detaylı"}[row.stockVisibility??""]??"-"}</td><td className="max-w-sm px-4 py-3"><span className={row.status==="VALID"?"font-semibold text-emerald-700":"font-medium text-red-800"}>{row.errorMessage ?? "Geçerli"}</span></td></tr>)}</tbody></table></div>
  </section>
  {batch.status === "PREVIEW" && !isExpired ? <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-sm leading-6 text-slate-600">Onay, tüm satırların standart fiyatını ve fiziksel stoğunu tek işlemde günceller. Ürünlerin yayın durumu değişmez.</p><div className="flex gap-3"><form action={cancel}><PendingSubmitButton pendingLabel="İptal ediliyor" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:border-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60">Partiyi iptal et</PendingSubmitButton></form><form action={apply}><PendingSubmitButton pendingLabel="Uygulanıyor" disabled={!canApply} className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-slate-300">Fiyat ve stoğu uygula</PendingSubmitButton></form></div></div> : null}
  </div>;
}
