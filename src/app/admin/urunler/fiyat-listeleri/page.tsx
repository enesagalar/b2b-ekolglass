import Link from "next/link";
import { ArrowLeft, Save, Tags } from "lucide-react";

import { currencies } from "@/domain/catalog";
import { savePriceList } from "@/features/catalog-management/actions";
import { CatalogActionForm } from "@/features/catalog-management/catalog-action-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700";
const labelClass = "grid gap-1.5 text-xs font-semibold text-slate-700";
const panelClass = "rounded-lg border border-slate-200 bg-white p-5 shadow-sm";

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      <Save size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

export default async function AdminPriceListsPage() {
  const priceLists = await prisma.priceList.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { prices: true } } },
  });

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/urunler" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
          <ArrowLeft size={16} aria-hidden="true" />
          Urun operasyonuna don
        </Link>
        <p className="mt-5 text-sm font-medium text-teal-800">Ticari fiyat altyapisi</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Fiyat listeleri</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Katalog fiyat gorunurlugu bu listeleri kullanir. Firma ve musteri grubu baglantilari sonraki bayi operasyon fazinda genisletilecek.
        </p>
      </div>

      <section className={panelClass}>
        <div className="flex items-center gap-3">
          <Tags size={20} className="text-teal-800" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-950">Yeni fiyat listesi</h2>
        </div>
        <CatalogActionForm action={savePriceList} className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.35fr_auto_auto]">
          <label className={labelClass}>
            Liste adi
            <input name="name" required className={inputClass} placeholder="Standart Bayi TRY" />
          </label>
          <label className={labelClass}>
            Para birimi
            <select name="currency" defaultValue="TRY" className={inputClass}>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex h-10 items-center gap-2 self-end text-sm font-medium text-slate-700">
            <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            Aktif
          </label>
          <div className="flex items-end">
            <SubmitButton label="Fiyat listesi ekle" />
          </div>
        </CatalogActionForm>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Liste kayitlari</h2>
          <p className="mt-1 text-sm text-slate-500">{priceLists.length} fiyat listesi listeleniyor.</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {priceLists.map((priceList) => (
            <CatalogActionForm key={priceList.id} action={savePriceList} className="grid gap-3 rounded-lg border border-slate-200 p-4">
              <input type="hidden" name="id" value={priceList.id} />
              <label className={labelClass}>
                Liste adi
                <input name="name" required defaultValue={priceList.name} className={inputClass} />
              </label>
              <label className={labelClass}>
                Para birimi
                <select name="currency" defaultValue={priceList.currency} className={inputClass}>
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center justify-between gap-3">
                <div className="grid gap-1">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" name="isActive" defaultChecked={priceList.isActive} className="h-4 w-4 rounded border-slate-300" />
                    Aktif
                  </label>
                  <span className="text-xs text-slate-500">{priceList._count.prices} fiyat satiri</span>
                </div>
                <SubmitButton label="Guncelle" />
              </div>
            </CatalogActionForm>
          ))}
        </div>
      </section>
    </div>
  );
}
