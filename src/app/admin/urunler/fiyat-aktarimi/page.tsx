import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Upload,
} from "lucide-react";
import Link from "next/link";

import { createPriceImportBatch } from "@/features/catalog-management/price-import-actions";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function scopeLabel(priceList: {
  company: { displayName: string } | null;
  customerGroup: { name: string } | null;
}) {
  return (
    priceList.company?.displayName ??
    priceList.customerGroup?.name ??
    "Tüm bayiler"
  );
}
const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#00639a]";

export default async function PriceImportPage({
  searchParams,
}: PageProps<"/admin/urunler/fiyat-aktarimi">) {
  const actor = await requirePermissionUser(
    "price.manage",
    "/admin/urunler/fiyat-aktarimi",
  );
  const query = await searchParams;
  const [priceLists, batches] = await Promise.all([
    prisma.priceList.findMany({
      where: { isActive: true },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      include: {
        company: { select: { displayName: true } },
        customerGroup: { select: { name: true } },
        _count: { select: { prices: true } },
      },
    }),
    prisma.catalogImportBatch.findMany({
      where: {
        createdById: actor.id,
        kind: { in: ["PRICE", "PRICE_ADJUSTMENT"] },
      },
      include: {
        priceList: { select: { name: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="grid gap-7">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-[#00639a]">Fiyat operasyonu</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">
            Excel fiyat aktarımı
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Seçtiğiniz listeyi ürün kodları ve mevcut fiyatlarla Excel olarak
            indirin. Düzenlenen dosya önce önizlenir; siz onaylamadan canlı bayi
            fiyatları değişmez.
          </p>
        </div>
        <Link
          href="/admin/urunler/fiyat-listeleri"
          className="text-sm font-semibold text-[#00639a]"
        >
          Fiyat merkezine dön
        </Link>
      </header>

      {param(query.error) ? (
        <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle size={18} />
          <span>{param(query.error)}</span>
        </div>
      ) : null}
      {param(query.success) ? (
        <div className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 size={18} />
          <span>{param(query.success)}</span>
        </div>
      ) : null}

      <section className="grid gap-6 rounded-lg border border-slate-200 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
        <form action={createPriceImportBatch} className="grid content-start gap-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf4fa] text-[#00639a]">
              <Upload size={19} />
            </span>
            <div>
              <h3 className="font-semibold text-slate-950">
                Düzenlenmiş Excel dosyasını yükle
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                `.xlsx`, en fazla 5 MB ve 5.000 fiyat satırı
              </p>
            </div>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Hedef fiyat listesi
            <select
              name="priceListId"
              required
              className={inputClass}
              defaultValue=""
            >
              <option value="" disabled>
                Fiyat listesi seçin
              </option>
              {priceLists.map((priceList) => (
                <option key={priceList.id} value={priceList.id}>
                  {priceList.name} · {scopeLabel(priceList)} ·{" "}
                  {priceList.currency}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Excel dosyası
            <input
              type="file"
              name="file"
              required
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white"
            />
          </label>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white">
            <FileSpreadsheet size={17} />
            Dosyayı kontrol et
          </button>
        </form>

        <aside className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h3 className="font-semibold text-slate-950">
            Doldurulmuş şablonu indir
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Her liste için ürün kodları ve varsa mevcut fiyatlar hazırlanır.
            Ürün adını değiştirmek katalog bilgisini değiştirmez.
          </p>
          <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto pr-1">
            {priceLists.map((priceList) => (
              <a
                key={priceList.id}
                href={`/api/admin/price-template.xlsx?priceListId=${priceList.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3 text-sm hover:border-[#00639a]"
              >
                <span className="min-w-0">
                  <strong className="block truncate">{priceList.name}</strong>
                  <span className="mt-1 block text-xs text-slate-500">
                    {scopeLabel(priceList)} · {priceList._count.prices} satır
                  </span>
                </span>
                <Download size={17} className="shrink-0 text-[#00639a]" />
              </a>
            ))}
          </div>
        </aside>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <History size={18} className="text-[#00639a]" />
          <div>
            <h3 className="font-semibold text-slate-950">Fiyat işlem geçmişi</h3>
            <p className="mt-1 text-xs text-slate-500">
              Excel aktarımları ve toplu artış/azalış işlemleri
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3">İşlem</th>
                <th className="px-5 py-3">Fiyat listesi</th>
                <th className="px-5 py-3">Satır</th>
                <th className="px-5 py-3">Durum</th>
                <th className="px-5 py-3">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/urunler/fiyat-aktarimi/${batch.id}`}
                      className="font-semibold text-[#00639a]"
                    >
                      {batch.kind === "PRICE_ADJUSTMENT"
                        ? "Toplu güncelleme"
                        : batch.fileName}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    {batch.priceList.name} · {batch.priceList.currency}
                  </td>
                  <td className="px-5 py-4">{batch.totalRows}</td>
                  <td className="px-5 py-4 font-semibold">
                    {{
                      PREVIEW: "Önizleme",
                      APPLIED: "Uygulandı",
                      CANCELLED: "İptal edildi",
                      REVERTED: "Geri alındı",
                    }[batch.status] ?? batch.status}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {batch.createdAt.toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))}
              {!batches.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Henüz fiyat işlemi yok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
