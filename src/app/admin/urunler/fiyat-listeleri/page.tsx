import Link from "next/link";
import { ArrowLeft, Building2, Calculator, Save, Tags } from "lucide-react";

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

function scopeOf(priceList: { companyId: string | null; customerGroupId: string | null }) {
  if (priceList.companyId) return "COMPANY";
  if (priceList.customerGroupId) return "CUSTOMER_GROUP";
  return "PUBLIC";
}

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function AdminPriceListsPage() {
  const [priceLists, customerGroups, companies] = await Promise.all([
    prisma.priceList.findMany({
      orderBy: [{ isActive: "desc" }, { priority: "desc" }, { name: "asc" }],
      include: {
        customerGroup: { select: { id: true, name: true } },
        company: { select: { id: true, displayName: true } },
        _count: { select: { prices: true } },
      },
    }),
    prisma.customerGroup.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.company.findMany({ where: { status: "APPROVED" }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
  ]);

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
          Burada ürünlerin standart bayi fiyatı belirlenir. Müşteri iskontosu firma kartından yüzde olarak yönetilir.
        </p>
      </div>

      <section className="grid gap-3 border-y border-slate-200 bg-white px-5 py-5 md:grid-cols-3">
        <div><p className="text-xs font-semibold text-teal-800">1. Genel bayi fiyatı</p><p className="mt-1 text-sm text-slate-600">Her ürün için standart, KDV hariç net bayi fiyatını girin.</p></div>
        <div><p className="text-xs font-semibold text-teal-800">2. Müşteri iskontosu</p><p className="mt-1 text-sm text-slate-600">Firma kartında örneğin yüzde 10 iskonto tanımlayın.</p></div>
        <div><p className="text-xs font-semibold text-teal-800">3. Sipariş fiyatı</p><p className="mt-1 text-sm text-slate-600">Sistem 1.000 TL baz fiyatı yüzde 10 iskonto ile 900 TL hesaplar.</p></div>
      </section>

      <Link href="/admin/firmalar" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-950">
        <Building2 size={16} aria-hidden="true" />
        Müşteri iskontolarını firma kartlarından yönet
      </Link>

      <section className={panelClass}>
        <div className="flex items-center gap-3">
          <Tags size={20} className="text-teal-800" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-950">Yeni fiyat listesi</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">Yeni liste bütün onaylı bayiler için standart baz fiyat oluşturur.</p>
        <CatalogActionForm action={savePriceList} className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
          <input type="hidden" name="scope" value="PUBLIC" />
          <input type="hidden" name="priority" value="0" />
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
          <label className="inline-flex h-10 items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            Aktif
          </label>
          <div className="flex justify-end">
            <SubmitButton label="Fiyat listesi ekle" />
          </div>
        </CatalogActionForm>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Liste kayitlari</h2>
          <p className="mt-1 text-sm text-slate-500">{priceLists.length} fiyat listesi listeleniyor.</p>
        </div>
        <div className="grid gap-4 p-5 xl:grid-cols-2">
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
              <label className={labelClass}>Fiyat kapsami<select name="scope" defaultValue={scopeOf(priceList)} className={inputClass}><option value="PUBLIC">Genel bayi fiyati</option><option value="CUSTOMER_GROUP">Musteri grubu</option><option value="COMPANY">Firma</option></select></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>Musteri grubu<select name="customerGroupId" defaultValue={priceList.customerGroupId ?? ""} className={inputClass}><option value="">Secilmedi</option>{customerGroups.map((group)=><option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
                <label className={labelClass}>Firma<select name="companyId" defaultValue={priceList.companyId ?? ""} className={inputClass}><option value="">Secilmedi</option>{companies.map((company)=><option key={company.id} value={company.id}>{company.displayName}</option>)}</select></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className={labelClass}>Baslangic<input type="date" name="startsAt" defaultValue={dateInput(priceList.startsAt)} className={inputClass}/></label>
                <label className={labelClass}>Bitis<input type="date" name="endsAt" defaultValue={dateInput(priceList.endsAt)} className={inputClass}/></label>
                <label className={labelClass}>Oncelik<input type="number" name="priority" min="0" defaultValue={priceList.priority} className={inputClass}/></label>
              </div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><Calculator size={14} aria-hidden="true" />Etkin kapsam: {priceList.company?.displayName ?? priceList.customerGroup?.name ?? "Tüm bayiler için genel baz fiyat"}</p>
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
