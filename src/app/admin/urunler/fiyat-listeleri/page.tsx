import Link from "next/link";
import {
  ArrowDownUp,
  ArrowLeft,
  Building2,
  Calculator,
  FileSpreadsheet,
  LockKeyhole,
  Save,
  Tags,
} from "lucide-react";

import { currencies } from "@/domain/catalog";
import { savePriceList } from "@/features/catalog-management/actions";
import { CatalogActionForm } from "@/features/catalog-management/catalog-action-form";
import { bulkAdjustPrices } from "@/features/catalog-management/price-bulk-actions";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#00639a]";
const labelClass = "grid gap-1.5 text-xs font-semibold text-slate-700";

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

function scopeOf(priceList: {
  companyId: string | null;
  customerGroupId: string | null;
}) {
  if (priceList.companyId) return "COMPANY";
  if (priceList.customerGroupId) return "CUSTOMER_GROUP";
  return "PUBLIC";
}

function scopeLabel(priceList: {
  company: { displayName: string } | null;
  customerGroup: { name: string } | null;
}) {
  return (
    priceList.company?.displayName ??
    priceList.customerGroup?.name ??
    "Tüm onaylı bayiler"
  );
}

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function AdminPriceListsPage() {
  await requirePermissionUser("price.read", "/admin/urunler/fiyat-listeleri");
  const [priceLists, customerGroups, companies] = await Promise.all([
    prisma.priceList.findMany({
      orderBy: [{ isActive: "desc" }, { priority: "desc" }, { name: "asc" }],
      include: {
        customerGroup: { select: { id: true, name: true } },
        company: { select: { id: true, displayName: true } },
        _count: { select: { prices: true } },
      },
    }),
    prisma.customerGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.company.findMany({
      where: { status: "APPROVED" },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
  ]);

  return (
    <div className="grid gap-7">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <Link
            href="/admin/urunler"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Ürün operasyonuna dön
          </Link>
          <p className="mt-5 text-sm font-semibold text-[#00639a]">
            Ticari fiyat merkezi
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">
            Fiyat listeleri ve iskontolar
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Ürünlerde iskonto öncesi liste fiyatını yönetin. Firma özel fiyatı
            varsa doğrudan o fiyat; yoksa müşteri grubu veya genel liste fiyatı
            seçilir ve firma kartındaki iskonto uygulanır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/firmalar"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            <Building2 size={16} />
            Firma iskontoları
          </Link>
          <Link
            href="/admin/urunler/fiyat-aktarimi"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#00639a] px-4 text-sm font-semibold text-white"
          >
            <FileSpreadsheet size={16} />
            Excel fiyat aktarımı
          </Link>
        </div>
      </header>

      <section className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-4">
        {[
          [
            "1. Kapsam",
            "Firma özel liste, müşteri grubu listesi veya tüm bayilere açık genel liste.",
          ],
          [
            "2. Liste fiyatı",
            "KDV hariç ve iskonto uygulanmadan önceki ürün fiyatı.",
          ],
          [
            "3. Firma iskontosu",
            "Firma kartında açıkça tanımlanır; aynı firmadaki kullanıcılar aynı ticari koşulu görür.",
          ],
          [
            "4. Net satış fiyatı",
            "Siparişe yazılan fiyat = seçilen liste fiyatı eksi firma iskontosu.",
          ],
        ].map(([title, body]) => (
          <div key={title} className="bg-white p-5">
            <p className="text-xs font-semibold text-[#00639a]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <Tags size={20} className="text-[#00639a]" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-slate-950">
              Yeni fiyat listesi oluştur
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Kapsamı baştan seçin. Fiyat satırı eklendikten sonra kapsam ve
              para birimi kilitlenir.
            </p>
          </div>
        </div>
        <CatalogActionForm
          action={savePriceList}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-end"
        >
          <label className={labelClass}>
            Liste adı
            <input
              name="name"
              required
              className={inputClass}
              placeholder="2026 Ana Bayi Fiyatı"
            />
          </label>
          <label className={labelClass}>
            Kapsam
            <select name="scope" defaultValue="PUBLIC" className={inputClass}>
              <option value="PUBLIC">Genel bayi listesi</option>
              <option value="CUSTOMER_GROUP">Müşteri grubu listesi</option>
              <option value="COMPANY">Firma özel listesi</option>
            </select>
          </label>
          <label className={labelClass}>
            Müşteri grubu
            <select name="customerGroupId" defaultValue="" className={inputClass}>
              <option value="">Seçilmedi</option>
              {customerGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Firma
            <select name="companyId" defaultValue="" className={inputClass}>
              <option value="">Seçilmedi</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.displayName}
                </option>
              ))}
            </select>
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
          <label className={labelClass}>
            Öncelik
            <input
              type="number"
              name="priority"
              min="0"
              max="9999"
              defaultValue="0"
              className={inputClass}
            />
          </label>
          <label className="inline-flex h-10 items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300"
            />
            Aktif
          </label>
          <SubmitButton label="Listeyi oluştur" />
        </CatalogActionForm>
      </section>

      <section className="grid gap-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            Tanımlı fiyat listeleri
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Aynı kapsamdaki listelerde yüksek öncelik önce seçilir.
          </p>
        </div>

        {priceLists.map((priceList) => {
          const scope = scopeOf(priceList);
          const locked = priceList._count.prices > 0;
          return (
            <article
              key={priceList.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-950">
                      {priceList.name}
                    </h4>
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        priceList.isActive
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {priceList.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {scopeLabel(priceList)} · {priceList.currency} ·{" "}
                    {priceList._count.prices} fiyat satırı · öncelik{" "}
                    {priceList.priority}
                  </p>
                </div>
                <a
                  href={`/api/admin/price-template.xlsx?priceListId=${priceList.id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
                >
                  <FileSpreadsheet size={16} />
                  Excel&apos;i indir
                </a>
              </div>

              <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
                <CatalogActionForm
                  action={savePriceList}
                  className="grid content-start gap-4"
                >
                  <input type="hidden" name="id" value={priceList.id} />
                  <input
                    type="hidden"
                    name="expectedUpdatedAt"
                    value={priceList.updatedAt.toISOString()}
                  />
                  <label className={labelClass}>
                    Liste adı
                    <input
                      name="name"
                      required
                      defaultValue={priceList.name}
                      className={inputClass}
                    />
                  </label>

                  {locked ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                      <input type="hidden" name="scope" value={scope} />
                      <input
                        type="hidden"
                        name="currency"
                        value={priceList.currency}
                      />
                      <input
                        type="hidden"
                        name="customerGroupId"
                        value={priceList.customerGroupId ?? ""}
                      />
                      <input
                        type="hidden"
                        name="companyId"
                        value={priceList.companyId ?? ""}
                      />
                      <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <LockKeyhole size={14} />
                        Kapsam ve para birimi kilitli
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Fiyat satırlarının yanlış kapsam veya para biriminde
                        yorumlanmaması için yeni bir liste sürümü oluşturun.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className={labelClass}>
                          Kapsam
                          <select
                            name="scope"
                            defaultValue={scope}
                            className={inputClass}
                          >
                            <option value="PUBLIC">Genel bayi listesi</option>
                            <option value="CUSTOMER_GROUP">
                              Müşteri grubu listesi
                            </option>
                            <option value="COMPANY">Firma özel listesi</option>
                          </select>
                        </label>
                        <label className={labelClass}>
                          Para birimi
                          <select
                            name="currency"
                            defaultValue={priceList.currency}
                            className={inputClass}
                          >
                            {currencies.map((currency) => (
                              <option key={currency} value={currency}>
                                {currency}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className={labelClass}>
                          Müşteri grubu
                          <select
                            name="customerGroupId"
                            defaultValue={priceList.customerGroupId ?? ""}
                            className={inputClass}
                          >
                            <option value="">Seçilmedi</option>
                            {customerGroups.map((group) => (
                              <option key={group.id} value={group.id}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={labelClass}>
                          Firma
                          <select
                            name="companyId"
                            defaultValue={priceList.companyId ?? ""}
                            className={inputClass}
                          >
                            <option value="">Seçilmedi</option>
                            {companies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.displayName}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </>
                  )}

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className={labelClass}>
                      Başlangıç
                      <input
                        type="date"
                        name="startsAt"
                        defaultValue={dateInput(priceList.startsAt)}
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Bitiş
                      <input
                        type="date"
                        name="endsAt"
                        defaultValue={dateInput(priceList.endsAt)}
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Öncelik
                      <input
                        type="number"
                        name="priority"
                        min="0"
                        defaultValue={priceList.priority}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={priceList.isActive}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Aktif
                    </label>
                    <SubmitButton label="Listeyi güncelle" />
                  </div>
                </CatalogActionForm>

                <div className="border-t border-slate-200 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                  <div className="flex items-center gap-3">
                    <ArrowDownUp size={18} className="text-[#00639a]" />
                    <div>
                      <h5 className="font-semibold text-slate-950">
                        Toplu fiyat artışı veya azalışı
                      </h5>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Listedeki tüm adet kademelerine atomik uygulanır ve geri
                        alınabilir işlem geçmişi oluşturur.
                      </p>
                    </div>
                  </div>
                  <CatalogActionForm
                    action={bulkAdjustPrices}
                    className="mt-4 grid gap-3"
                  >
                    <input
                      type="hidden"
                      name="priceListId"
                      value={priceList.id}
                    />
                    <input
                      type="hidden"
                      name="expectedUpdatedAt"
                      value={priceList.updatedAt.toISOString()}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <label className={labelClass}>
                        İşlem
                        <select
                          name="operation"
                          defaultValue="INCREASE"
                          className={inputClass}
                        >
                          <option value="INCREASE">Artır</option>
                          <option value="DECREASE">Azalt</option>
                        </select>
                      </label>
                      <label className={labelClass}>
                        Yöntem
                        <select
                          name="method"
                          defaultValue="PERCENT"
                          className={inputClass}
                        >
                          <option value="PERCENT">Yüzde (%)</option>
                          <option value="FIXED">Sabit tutar</option>
                        </select>
                      </label>
                    </div>
                    <label className={labelClass}>
                      Değer
                      <input
                        type="number"
                        name="value"
                        min="0.01"
                        step="0.01"
                        required
                        className={inputClass}
                        placeholder="Örn. 10"
                      />
                    </label>
                    <label className={labelClass}>
                      İşlem gerekçesi
                      <textarea
                        name="reason"
                        required
                        minLength={10}
                        maxLength={500}
                        rows={2}
                        className="rounded-md border border-slate-300 bg-white p-3 text-sm"
                        placeholder="Yeni dönem maliyet güncellemesi"
                      />
                    </label>
                    <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                      <input
                        type="checkbox"
                        name="confirmed"
                        required
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                      />
                      Bu işlemin listedeki {priceList._count.prices} fiyat
                      satırını değiştireceğini onaylıyorum.
                    </label>
                    <button
                      type="submit"
                      disabled={!priceList._count.prices}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#00639a] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Calculator size={16} />
                      Toplu işlemi uygula
                    </button>
                  </CatalogActionForm>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
