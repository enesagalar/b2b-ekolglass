import Link from "next/link";
import {
  ArrowDownUp,
  ArrowLeft,
  Building2,
  Calculator,
  ChevronDown,
  CircleCheck,
  FileSpreadsheet,
  Save,
  Settings2,
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
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#00639a]";
const labelClass = "grid gap-1.5 text-xs font-semibold text-slate-700";

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
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

function audienceLabel(priceList: {
  company: { displayName: string } | null;
  customerGroup: { name: string } | null;
}) {
  if (priceList.company) return `Yalnız ${priceList.company.displayName}`;
  if (priceList.customerGroup) {
    return `${priceList.customerGroup.name} grubundaki firmalar`;
  }
  return "Tüm bayiler";
}

function kindLabel(priceList: {
  companyId: string | null;
  customerGroupId: string | null;
}) {
  if (priceList.companyId) return "Firma özel fiyatı";
  if (priceList.customerGroupId) return "Grup fiyatı";
  return "Ana bayi fiyatı";
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

  const activeLists = priceLists.filter((priceList) => priceList.isActive);
  const generalLists = priceLists.filter(
    (priceList) => !priceList.companyId && !priceList.customerGroupId,
  );
  const exceptionLists = priceLists.filter(
    (priceList) => priceList.companyId || priceList.customerGroupId,
  );

  return (
    <div className="grid min-w-0 gap-7">
      <header className="border-b border-slate-200 pb-6">
        <Link
          href="/admin/urunler"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Ürün yönetimine dön
        </Link>
        <p className="mt-5 text-sm font-semibold text-[#00639a]">
          Ticari yönetim
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">
          Fiyat yönetimi
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Önce ürünlerin ana bayi fiyatını belirleyin. Daha sonra gerekiyorsa
          firma kartından iskonto tanımlayın. Firma veya grup için ayrı fiyat
          kullanımı yalnız istisnai durumlarda gereklidir.
        </p>
      </header>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-950">Ne yapmak istiyorsunuz?</h3>
          <p className="mt-1 text-sm text-slate-500">
            Günlük fiyat işlemleri için aşağıdaki üç adım yeterlidir.
          </p>
        </div>
        <div className="divide-y divide-slate-200">
          <Link
            href="/admin/urunler/fiyat-aktarimi"
            className="group flex items-start gap-4 p-5 transition hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eaf4fa] text-[#00639a]">
              <FileSpreadsheet size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm text-slate-950">
                Ürün fiyatlarını Excel ile güncelle
              </strong>
              <span className="mt-1 block text-sm leading-6 text-slate-500">
                Mevcut fiyatlarla dolu dosyayı indirin, düzenleyin ve kontrol
                ederek sisteme alın.
              </span>
            </span>
            <span className="text-sm font-semibold text-[#00639a]">Aç</span>
          </Link>
          <Link
            href="/admin/firmalar"
            className="group flex items-start gap-4 p-5 transition hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Building2 size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm text-slate-950">
                Bir firmaya iskonto tanımla
              </strong>
              <span className="mt-1 block text-sm leading-6 text-slate-500">
                Firma kartını açın ve iskonto oranını belirleyin. Aynı firmadaki
                tüm bayi kullanıcıları aynı koşulu görür.
              </span>
            </span>
            <span className="text-sm font-semibold text-[#00639a]">
              Firmalara git
            </span>
          </Link>
          <a
            href="#toplu-guncelleme"
            className="group flex items-start gap-4 p-5 transition hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <ArrowDownUp size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm text-slate-950">
                Tüm fiyatlara zam veya indirim uygula
              </strong>
              <span className="mt-1 block text-sm leading-6 text-slate-500">
                Seçtiğiniz listedeki bütün ürünleri yüzde veya sabit tutarla
                güncelleyin.
              </span>
            </span>
            <span className="text-sm font-semibold text-[#00639a]">
              Listeleri gör
            </span>
          </a>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-[#b9d8e9] bg-[#f4f9fc] p-5 md:grid-cols-[auto_1fr] md:items-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#00639a]">
          <Calculator size={19} />
        </span>
        <div>
          <h3 className="font-semibold text-slate-950">
            Bayinin göreceği fiyat nasıl hesaplanır?
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Ana bayi fiyatı 1.000 TL ve firma iskontosu %10 ise sipariş fiyatı
            900 TL olur. Firmaya özel fiyat tanımlandıysa ek iskonto uygulanmaz.
          </p>
        </div>
      </section>

      <section id="toplu-guncelleme" className="grid gap-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              Kullanılan fiyat listeleri
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {activeLists.length} aktif liste bulunuyor. Günlük işlemler için
              çoğunlukla yalnız “Ana bayi fiyatı” kullanılır.
            </p>
          </div>
          <Link
            href="/admin/urunler/fiyat-aktarimi"
            className="text-sm font-semibold text-[#00639a]"
          >
            İşlem geçmişini aç
          </Link>
        </div>

        {generalLists.map((priceList) => {
          const scope = scopeOf(priceList);
          const locked = priceList._count.prices > 0;
          return (
            <article
              key={priceList.id}
              className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00639a]">
                      <CircleCheck size={14} />
                      {kindLabel(priceList)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {priceList.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  <h4 className="mt-2 text-lg font-semibold text-slate-950">
                    {priceList.name}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {audienceLabel(priceList)} · {priceList.currency} ·{" "}
                    {priceList._count.prices} ürün fiyatı
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/admin/price-template.xlsx?priceListId=${priceList.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
                  >
                    <FileSpreadsheet size={16} />
                    Excel&apos;i indir
                  </a>
                  <Link
                    href="/admin/urunler/fiyat-aktarimi"
                    className="inline-flex h-10 items-center rounded-md bg-[#00639a] px-4 text-sm font-semibold text-white"
                  >
                    Fiyatları güncelle
                  </Link>
                </div>
              </div>

              <div className="border-t border-slate-200">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-800">
                    <span className="inline-flex items-center gap-2">
                      <ArrowDownUp size={16} className="text-[#00639a]" />
                      Toplu zam veya indirim
                    </span>
                    <ChevronDown
                      size={17}
                      className="transition group-open:rotate-180"
                    />
                  </summary>
                  <CatalogActionForm
                    action={bulkAdjustPrices}
                    className="grid gap-4 border-t border-slate-200 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-[150px_160px_160px_minmax(240px,1fr)] xl:items-end"
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
                    <label className={labelClass}>
                      İşlem
                      <select
                        name="operation"
                        defaultValue="INCREASE"
                        className={inputClass}
                      >
                        <option value="INCREASE">Zam yap</option>
                        <option value="DECREASE">İndirim yap</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      Hesaplama
                      <select
                        name="method"
                        defaultValue="PERCENT"
                        className={inputClass}
                      >
                        <option value="PERCENT">Yüzde</option>
                        <option value="FIXED">Sabit tutar</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      Oran veya tutar
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
                      Neden
                      <input
                        name="reason"
                        required
                        minLength={10}
                        maxLength={500}
                        className={inputClass}
                        placeholder="Örn. Ağustos maliyet güncellemesi"
                      />
                    </label>
                    <label className="flex items-start gap-2 text-xs leading-5 text-slate-600 md:col-span-2 xl:col-span-3">
                      <input
                        type="checkbox"
                        name="confirmed"
                        required
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                      />
                      {priceList._count.prices} ürün için değişiklik
                      önizlemesi hazırlanacağını onaylıyorum.
                    </label>
                    <button
                      type="submit"
                      disabled={!priceList._count.prices}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Calculator size={16} />
                      Önizlemeyi hazırla
                    </button>
                  </CatalogActionForm>
                </details>

                <details className="group border-t border-slate-200">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <Settings2 size={16} />
                      Liste ayarları
                    </span>
                    <ChevronDown
                      size={17}
                      className="transition group-open:rotate-180"
                    />
                  </summary>
                  <CatalogActionForm
                    action={savePriceList}
                    className="grid gap-4 border-t border-slate-200 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-4 xl:items-end"
                  >
                    <input type="hidden" name="id" value={priceList.id} />
                    <input
                      type="hidden"
                      name="expectedUpdatedAt"
                      value={priceList.updatedAt.toISOString()}
                    />
                    <input type="hidden" name="scope" value={scope} />
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
                      <input
                        type="hidden"
                        name="currency"
                        value={priceList.currency}
                      />
                    ) : (
                      <label className={labelClass}>
                        Para birimi
                        <select
                          name="currency"
                          defaultValue={priceList.currency}
                          className={inputClass}
                        >
                          {currencies.map((currency) => (
                            <option key={currency}>{currency}</option>
                          ))}
                        </select>
                      </label>
                    )}
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
                    <input
                      type="hidden"
                      name="priority"
                      value={priceList.priority}
                    />
                    <label className="inline-flex h-11 items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={priceList.isActive}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Satışta kullan
                    </label>
                    <SubmitButton label="Ayarları kaydet" />
                  </CatalogActionForm>
                </details>
              </div>
            </article>
          );
        })}

        {!generalLists.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <h4 className="font-semibold text-amber-950">
              Ana bayi fiyat listesi bulunmuyor
            </h4>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Aşağıdaki gelişmiş bölümden tüm bayiler için bir ana fiyat listesi
              oluşturun, ardından Excel ile ürün fiyatlarını yükleyin.
            </p>
          </div>
        ) : null}
      </section>

      <details className="group rounded-lg border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
          <span>
            <span className="flex items-center gap-2 font-semibold text-slate-950">
              <Tags size={18} className="text-[#00639a]" />
              Gelişmiş fiyat ayarları
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              Yeni liste oluşturma ve firma/grup özel fiyatları
            </span>
          </span>
          <ChevronDown
            size={18}
            className="shrink-0 transition group-open:rotate-180"
          />
        </summary>

        <div className="grid gap-6 border-t border-slate-200 p-5">
          <section>
            <h3 className="font-semibold text-slate-950">
              Yeni fiyat listesi oluştur
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Normal kullanımda “Tüm bayiler” seçin. Yalnız belirli bir firma
              veya grup farklı ürün fiyatları görecekse diğer seçenekleri
              kullanın.
            </p>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              Mevcut ana bayi fiyatı ve firma iskontosu ihtiyacınızı
              karşılıyorsa yeni liste oluşturmayın. Aşağıdaki seçenekler yalnız
              farklı ürün fiyatı verilmesi gereken istisnalar içindir.
            </div>
            <div className="mt-4 grid gap-3">
              <details className="group rounded-lg border border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                  <span>
                    <span className="block font-semibold text-slate-950">
                      Yeni ana bayi fiyatı oluştur
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Yeni dönem veya farklı para birimi için.
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className="shrink-0 transition group-open:rotate-180"
                  />
                </summary>
                <CatalogActionForm
                  action={savePriceList}
                  className="grid gap-4 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 sm:items-end"
                >
                  <input type="hidden" name="scope" value="PUBLIC" />
                  <input type="hidden" name="priority" value="0" />
                  <input type="hidden" name="isActive" value="on" />
                  <label className={labelClass}>
                    Liste adı
                    <input
                      name="name"
                      required
                      className={inputClass}
                      placeholder="2027 Ana Bayi Fiyatları"
                    />
                  </label>
                  <label className={labelClass}>
                    Para birimi
                    <select
                      name="currency"
                      defaultValue="TRY"
                      className={inputClass}
                    >
                      {currencies.map((currency) => (
                        <option key={currency}>{currency}</option>
                      ))}
                    </select>
                  </label>
                  <div className="sm:col-span-2">
                    <SubmitButton label="Ana listeyi oluştur" />
                  </div>
                </CatalogActionForm>
              </details>

              <details className="group rounded-lg border border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                  <span>
                    <span className="block font-semibold text-slate-950">
                      Firmaya özel ürün fiyatı oluştur
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Yüzde iskonto yeterli değilse kullanın.
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className="shrink-0 transition group-open:rotate-180"
                  />
                </summary>
                <CatalogActionForm
                  action={savePriceList}
                  className="grid gap-4 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 sm:items-end"
                >
                  <input type="hidden" name="scope" value="COMPANY" />
                  <input type="hidden" name="priority" value="0" />
                  <input type="hidden" name="isActive" value="on" />
                  <input type="hidden" name="currency" value="TRY" />
                  <label className={labelClass}>
                    Firma
                    <select name="companyId" required className={inputClass}>
                      <option value="">Firma seçin</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Liste adı
                    <input
                      name="name"
                      required
                      className={inputClass}
                      placeholder="Firma Özel Fiyatları"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <SubmitButton label="Firma listesini oluştur" />
                  </div>
                </CatalogActionForm>
              </details>

              <details className="group rounded-lg border border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                  <span>
                    <span className="block font-semibold text-slate-950">
                      Bayi grubuna özel ürün fiyatı oluştur
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Birden fazla firma aynı özel fiyatları paylaşacaksa.
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className="shrink-0 transition group-open:rotate-180"
                  />
                </summary>
                <CatalogActionForm
                  action={savePriceList}
                  className="grid gap-4 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 sm:items-end"
                >
                  <input
                    type="hidden"
                    name="scope"
                    value="CUSTOMER_GROUP"
                  />
                  <input type="hidden" name="priority" value="0" />
                  <input type="hidden" name="isActive" value="on" />
                  <input type="hidden" name="currency" value="TRY" />
                  <label className={labelClass}>
                    Bayi grubu
                    <select
                      name="customerGroupId"
                      required
                      className={inputClass}
                    >
                      <option value="">Grup seçin</option>
                      {customerGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Liste adı
                    <input
                      name="name"
                      required
                      className={inputClass}
                      placeholder="Grup Özel Fiyatları"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <SubmitButton label="Grup listesini oluştur" />
                  </div>
                </CatalogActionForm>
              </details>
            </div>
          </section>

          {exceptionLists.length ? (
            <section className="border-t border-slate-200 pt-5">
              <h3 className="font-semibold text-slate-950">
                Tanımlı özel fiyat listeleri
              </h3>
              <div className="mt-3 grid gap-3">
                {exceptionLists.map((priceList) => {
                  const scope = scopeOf(priceList);
                  return (
                    <details
                      key={priceList.id}
                      className="group rounded-lg border border-slate-200 bg-white"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-950">
                            {priceList.name}
                          </span>
                          <span className="mt-1 block text-sm text-slate-500">
                            {kindLabel(priceList)} · {audienceLabel(priceList)} ·{" "}
                            {priceList._count.prices} ürün fiyatı ·{" "}
                            {priceList.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </span>
                        <ChevronDown
                          size={18}
                          className="shrink-0 transition group-open:rotate-180"
                        />
                      </summary>
                      <div className="grid gap-5 border-t border-slate-200 p-4 xl:grid-cols-2">
                        <section>
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold text-slate-950">
                              Ürün fiyatları
                            </h4>
                            <a
                              href={`/api/admin/price-template.xlsx?priceListId=${priceList.id}`}
                              className="text-sm font-semibold text-[#00639a]"
                            >
                              Excel&apos;i indir
                            </a>
                          </div>
                          <CatalogActionForm
                            action={bulkAdjustPrices}
                            className="mt-4 grid gap-3 sm:grid-cols-2"
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
                            <label className={labelClass}>
                              İşlem
                              <select
                                name="operation"
                                defaultValue="INCREASE"
                                className={inputClass}
                              >
                                <option value="INCREASE">Zam yap</option>
                                <option value="DECREASE">İndirim yap</option>
                              </select>
                            </label>
                            <label className={labelClass}>
                              Hesaplama
                              <select
                                name="method"
                                defaultValue="PERCENT"
                                className={inputClass}
                              >
                                <option value="PERCENT">Yüzde</option>
                                <option value="FIXED">Sabit tutar</option>
                              </select>
                            </label>
                            <label className={labelClass}>
                              Oran veya tutar
                              <input
                                type="number"
                                name="value"
                                min="0.01"
                                step="0.01"
                                required
                                className={inputClass}
                              />
                            </label>
                            <label className={labelClass}>
                              Neden
                              <input
                                name="reason"
                                required
                                minLength={10}
                                maxLength={500}
                                className={inputClass}
                                placeholder="Maliyet güncellemesi"
                              />
                            </label>
                            <label className="flex items-start gap-2 text-xs leading-5 text-slate-600 sm:col-span-2">
                              <input
                                type="checkbox"
                                name="confirmed"
                                required
                                className="mt-0.5 h-4 w-4 rounded border-slate-300"
                              />
                              {priceList._count.prices} ürün fiyatının
                              için değişiklik önizlemesi hazırlanacağını
                              onaylıyorum.
                            </label>
                            <button
                              type="submit"
                              disabled={!priceList._count.prices}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40 sm:col-span-2"
                            >
                              <Calculator size={16} />
                              Önizlemeyi hazırla
                            </button>
                          </CatalogActionForm>
                        </section>

                        <section className="border-t border-slate-200 pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                          <h4 className="text-sm font-semibold text-slate-950">
                            Liste ayarları
                          </h4>
                          <CatalogActionForm
                            action={savePriceList}
                            className="mt-4 grid gap-3 sm:grid-cols-2"
                          >
                            <input type="hidden" name="id" value={priceList.id} />
                            <input
                              type="hidden"
                              name="expectedUpdatedAt"
                              value={priceList.updatedAt.toISOString()}
                            />
                            <input type="hidden" name="scope" value={scope} />
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
                            <input
                              type="hidden"
                              name="currency"
                              value={priceList.currency}
                            />
                            <input
                              type="hidden"
                              name="priority"
                              value={priceList.priority}
                            />
                            <label className={`${labelClass} sm:col-span-2`}>
                              Liste adı
                              <input
                                name="name"
                                required
                                defaultValue={priceList.name}
                                className={inputClass}
                              />
                            </label>
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
                            <label className="inline-flex h-11 items-center gap-2 text-sm font-medium text-slate-700">
                              <input
                                type="checkbox"
                                name="isActive"
                                defaultChecked={priceList.isActive}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              Satışta kullan
                            </label>
                            <SubmitButton label="Ayarları kaydet" />
                          </CatalogActionForm>
                        </section>
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </details>
    </div>
  );
}
