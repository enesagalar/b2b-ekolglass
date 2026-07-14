import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";

import { createPriceStockImportBatch } from "@/features/catalog-management/price-stock-import-actions";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function param(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function PriceStockImportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePermissionUser("price.manage", "/admin/urunler/fiyat-stok-aktarimi");
  await requirePermissionUser("stock.manage", "/admin/urunler/fiyat-stok-aktarimi");
  const query = await searchParams;
  const now = new Date();
  const [priceLists, batches] = await Promise.all([
    prisma.priceList.findMany({ where: { companyId: null, customerGroupId: null, isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] }, orderBy: [{ priority: "desc" }, { name: "asc" }] }),
    prisma.catalogImportBatch.findMany({ where: { createdById: actor.id }, include: { priceList: { select: { name: true, currency: true } } }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  return <div className="grid gap-6">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="text-sm font-semibold text-teal-800">Kontrollü ticari veri aktarımı</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Standart fiyat ve stok aktarımı</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">CSV önce doğrulanır ve önizleme partisine alınır. Onay verilene kadar canlı fiyat ve stok kayıtları değişmez.</p></div>
      <Link href="/admin/urunler" className="text-sm font-semibold text-slate-600 hover:text-slate-950">Ürün operasyonuna dön</Link>
    </header>
    {param(query.error) ? <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900"><AlertTriangle size={18}/><span>{param(query.error)}</span></div> : null}
    {param(query.success) ? <div className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 size={18}/><span>{param(query.success)}</span></div> : null}
    <section className="grid gap-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:grid-cols-[1.2fr_0.8fr]">
      <form action={createPriceStockImportBatch} className="grid content-start gap-5" encType="multipart/form-data">
        <div className="flex items-center gap-3"><Upload size={20} className="text-teal-800"/><div><h2 className="font-semibold text-slate-950">Yeni dosya yükle</h2><p className="mt-1 text-sm text-slate-500">UTF-8 CSV, en fazla 2 MB ve 2.000 ürün.</p></div></div>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">Standart genel bayi fiyat listesi<select name="priceListId" required className="h-11 rounded-md border border-slate-300 bg-white px-3 font-normal text-slate-950"><option value="">Fiyat listesi seçin</option>{priceLists.map(list => <option key={list.id} value={list.id}>{list.name} ({list.currency})</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">CSV dosyası<input name="file" type="file" accept=".csv,text/csv" required className="min-h-11 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-teal-800 file:px-3 file:py-2 file:font-semibold file:text-white"/></label>
        <button disabled={!priceLists.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-slate-300"><FileSpreadsheet size={17}/>Dosyayı doğrula ve önizle</button>
      </form>
      <aside className="border-t border-slate-200 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"><h2 className="font-semibold text-slate-950">CSV sözleşmesi</h2><ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-600"><li><strong className="text-slate-800">1.</strong> Ürün kodları katalogda önceden bulunmalıdır.</li><li><strong className="text-slate-800">2.</strong> Fiyat nokta veya virgülle iki ondalığa kadar girilebilir.</li><li><strong className="text-slate-800">3.</strong> Görünürlük: GIZLI, SADE veya DETAYLI.</li><li><strong className="text-slate-800">4.</strong> Fiziksel stok mevcut rezervasyonun altına inemez.</li></ol><a href="/templates/ekolglass-fiyat-stok-sablonu.csv" download className="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-800"><Download size={16}/>UTF-8 şablonu indir</a></aside>
    </section>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-950">Son aktarım partileri</h2></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="px-5 py-3">Dosya</th><th className="px-5 py-3">Fiyat listesi</th><th className="px-5 py-3">Satır</th><th className="px-5 py-3">Durum</th><th className="px-5 py-3">Tarih</th></tr></thead><tbody className="divide-y divide-slate-100">{batches.map(batch => <tr key={batch.id}><td className="px-5 py-4"><Link href={`/admin/urunler/fiyat-stok-aktarimi/${batch.id}`} className="font-semibold text-teal-800 hover:underline">{batch.fileName}</Link></td><td className="px-5 py-4 text-slate-600">{batch.priceList.name}</td><td className="px-5 py-4 text-slate-600">{batch.validRows} geçerli / {batch.invalidRows} hatalı</td><td className="px-5 py-4 font-semibold text-slate-700">{{PREVIEW:"Önizleme",APPLIED:"Uygulandı",CANCELLED:"İptal edildi"}[batch.status] ?? batch.status}</td><td className="px-5 py-4 text-slate-500">{batch.createdAt.toLocaleString("tr-TR")}</td></tr>)}{!batches.length ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Henüz aktarım partisi yok.</td></tr> : null}</tbody></table></div></section>
  </div>;
}
