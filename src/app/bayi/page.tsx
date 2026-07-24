import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  CreditCard,
  PackageSearch,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { requireDealerContext } from "@/data/dealer-context";
import { getDealerDashboardData } from "@/data/dealer-portal";
import { formatPortalDate, formatPortalMoney, PortalStatus } from "@/features/dealer/dealer-ui";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function DealerDashboardPage() {
  const { company, user } = await requireDealerContext("/bayi");
  const dashboard = await getDealerDashboardData(company.id);
  const creditSummary =
    company.creditPolicy === "UNLIMITED"
      ? "Limitsiz"
      : company.creditPolicy === "LIMITED" && company.creditLimit
        ? formatPortalMoney(company.creditLimit)
        : "Ticari onaylı";

  const metrics = [
    { label: "Açık sipariş", value: dashboard.openOrders, icon: ClipboardList },
    { label: "Aktif sevkiyat", value: dashboard.activeShipments, icon: Truck },
    { label: "Aktif ürün", value: dashboard.activeProducts, icon: Boxes },
    {
      label: "Kredi limiti",
      value: creditSummary,
      icon: CreditCard,
    },
  ];

  return (
    <div className="grid min-w-0 gap-8">
      <section className="overflow-hidden rounded-[16px] bg-[#171b1f] text-white shadow-[0_24px_70px_rgba(20,29,36,0.16)]">
        <div className="flex flex-col justify-between gap-6 border-b border-white/10 px-5 py-7 md:flex-row md:items-end md:px-7 md:py-8">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#71b8dc]">{company.displayName}</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">İyi günler, {user.name.split(" ")[0]}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
              Sipariş, sevkiyat ve ticari hesabınızın güncel durumunu buradan takip edin.
            </p>
          </div>
          <Link href="/urunler" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0879b1] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,99,154,0.25)] hover:bg-[#0a6d9e]">
            <PackageSearch size={17} aria-hidden="true" /> Yeni Sipariş
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4" aria-label="Firma özeti">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="min-w-0 border-b border-r border-white/10 px-5 py-5 last:border-r-0 md:border-b-0 md:px-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-medium text-white/48">{metric.label}</p>
                  <Icon size={17} className="shrink-0 text-[#71b8dc]" aria-hidden="true" />
                </div>
                <p className="mt-3 truncate text-2xl font-semibold text-white">{metric.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9dadd] pb-5 text-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p><span className="text-[#68686d]">Müşteri grubu</span> <strong className="ml-2">{company.customerGroup?.name ?? "Atanmamış"}</strong></p>
          <p><span className="text-[#68686d]">Vade</span> <strong className="ml-2">{company.paymentTerms ?? "Vade tanımlanmamış"}</strong></p>
          <p><span className="text-[#68686d]">Firma iskontosu</span> <strong className="ml-2 text-emerald-700">%{Number(company.discountRate ?? 0).toLocaleString("tr-TR")}</strong></p>
        </div>
        <Link href="/bayi/hesabim" className="inline-flex items-center gap-1 font-semibold text-[#00639a]">
          Hesap ayrıntıları <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <div className="overflow-hidden rounded-lg border border-[#d9dadd] bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#d9dadd] px-5 py-4">
            <div><h3 className="font-semibold">Son siparişler</h3><p className="mt-1 text-xs text-[#68686d]">Firma hesabınıza ait son operasyonlar</p></div>
            <Link href="/bayi/siparisler" className="inline-flex items-center gap-1 text-sm font-semibold text-[#00639a]">Tümü <ArrowRight size={15} /></Link>
          </div>
          {dashboard.recentOrders.length ? (
            <div className="divide-y divide-[#ececef]">
              {dashboard.recentOrders.map((order) => (
                <Link key={order.id} href={`/bayi/siparisler/${order.id}`} className="grid gap-3 px-5 py-4 hover:bg-[#f7fafc] sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{order.orderNumber}</p><p className="mt-1 text-xs text-[#68686d]">{formatPortalDate(order.createdAt)} · {order._count.items} kalem</p></div>
                  <span className="text-sm font-semibold">{formatPortalMoney(order.subtotal, order.currency)}</span>
                  <PortalStatus status={order.status} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center"><ClipboardList className="mx-auto text-[#a5a7ab]" size={28} /><p className="mt-3 text-sm font-semibold">Henüz sipariş bulunmuyor</p><p className="mt-1 text-xs text-[#68686d]">Ürünleri inceleyerek ilk siparişinizi oluşturabilirsiniz.</p></div>
          )}
        </div>

        <aside className="rounded-lg border border-[#d9dadd] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3"><CreditCard size={20} className="text-[#00639a]" /><h3 className="font-semibold">Ticari hesap</h3></div>
          <dl className="mt-5 divide-y divide-[#ececef] text-sm">
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[#68686d]">Müşteri grubu</dt><dd className="text-right font-semibold">{company.customerGroup?.name ?? "Atanmamış"}</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[#68686d]">Firma iskontosu</dt><dd className="font-semibold text-emerald-700">%{Number(company.discountRate ?? 0).toLocaleString("tr-TR")}</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[#68686d]">Vade</dt><dd className="text-right font-semibold">{company.paymentTerms ?? "Vade tanımlanmamış"}</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[#68686d]">Kredi limiti</dt><dd className="text-right font-semibold">{creditSummary}</dd></div>
            {company.creditPolicy === "LIMITED" && company.creditLimit ? (
              <>
                <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[#68686d]">Açık sipariş riski</dt><dd className="text-right font-semibold">{formatPortalMoney(dashboard.creditExposure)}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[#68686d]">Kullanılabilir limit</dt><dd className={`text-right font-semibold ${dashboard.creditExposure.gte(company.creditLimit) ? "text-amber-800" : "text-emerald-700"}`}>{formatPortalMoney(Prisma.Decimal.max(company.creditLimit.sub(dashboard.creditExposure), 0))}</dd></div>
              </>
            ) : null}
          </dl>
          <Link href="/bayi/hesabim" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#00639a]">Hesap ayrıntıları <ArrowRight size={15} /></Link>
        </aside>
      </section>

      <section className="grid gap-5 border-t border-[#d9dadd] pt-7 md:grid-cols-2">
        <Link href="/urunler" className="interactive-lift flex items-start gap-4 rounded-lg border border-[#d9dadd] bg-white p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eaf4fa] text-[#00639a]"><ShoppingBag size={20} /></span>
          <span><strong className="block">Ürün ve fiyatları aç</strong><span className="mt-2 block text-sm leading-6 text-[#68686d]">Ürün kodu, OEM veya araçla arayın; firma fiyatınızla sepete ekleyin.</span></span>
        </Link>
        <Link href="/sepet" className="interactive-lift flex items-start gap-4 rounded-lg border border-[#d9dadd] bg-white p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef0f2] text-[#303236]"><ClipboardList size={20} /></span>
          <span><strong className="block">Sipariş sepetini kontrol et</strong><span className="mt-2 block text-sm leading-6 text-[#68686d]">Miktar, stok, teslimat adresi ve ticari koşulları doğrulayın.</span></span>
        </Link>
      </section>
    </div>
  );
}
