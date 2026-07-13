import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  Truck,
  UsersRound,
} from "lucide-react";

import { getStatusLabel } from "@/domain/statuses";
import { getOutboxHealth } from "@/integrations/outbox-health";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";

async function getDashboardData() {
  const [
    pendingDealers,
    openQuotes,
    approvalOrders,
    lowStockCount,
    readyShipments,
    integrationWarnings,
    recentApplications,
    lowStockItems,
    recentAuditLogs,
    shippingProviders,
  ] = await Promise.all([
    prisma.dealerApplication.count({
      where: { status: { in: ["NEW", "IN_REVIEW"] } },
    }),
    prisma.quoteRequest.count({
      where: { status: { in: ["NEW", "IN_REVIEW", "PRICED", "OFFER_SENT"] } },
    }),
    prisma.order.count({
      where: {
        status: { in: ["SUBMITTED", "WAITING_FOR_APPROVAL", "CONFIRMED"] },
      },
    }),
    prisma.stockItem.count({
      where: { status: { in: ["LOW_STOCK", "OUT_OF_STOCK"] } },
    }),
    prisma.order.count({ where: { status: "READY_FOR_SHIPMENT" } }),
    getOutboxHealth(),
    prisma.dealerApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.stockItem.findMany({
      where: {
        status: { in: ["LOW_STOCK", "OUT_OF_STOCK", "ASK_FOR_AVAILABILITY"] },
      },
      include: { product: true },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 6,
    }),
    prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.shippingProvider.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 4,
    }),
  ]);

  return {
    integrationWarnings:
      integrationWarnings.dead +
      integrationWarnings.overdue +
      integrationWarnings.expiredLeases +
      integrationWarnings.unsupportedReady,
    metrics: [
      {
        label: "Bekleyen bayi",
        value: pendingDealers,
        href: "/admin/bayi-basvurulari",
        icon: UsersRound,
        tone: "teal",
      },
      {
        label: "Açık teklif",
        value: openQuotes,
        href: "/admin/teklifler",
        icon: FileText,
        tone: "slate",
      },
      {
        label: "Onay bekleyen sipariş",
        value: approvalOrders,
        href: "/admin/siparisler?status=SUBMITTED",
        icon: ClipboardCheck,
        tone: "slate",
      },
      {
        label: "Stok alarmı",
        value: lowStockCount,
        href: "/admin/urunler",
        icon: Boxes,
        tone: lowStockCount > 0 ? "amber" : "teal",
      },
      {
        label: "Sevke hazır",
        value: readyShipments,
        href: undefined,
        icon: Truck,
        tone: "slate",
      },
      {
        label: "Entegrasyon uyarısı",
        value:
          integrationWarnings.dead +
          integrationWarnings.overdue +
          integrationWarnings.expiredLeases +
          integrationWarnings.unsupportedReady,
        href: "/admin/entegrasyonlar",
        icon: AlertTriangle,
        tone: integrationWarnings.status === "degraded" ? "red" : "teal",
      },
    ],
    recentApplications,
    lowStockItems,
    recentAuditLogs,
    shippingProviders,
  };
}

function toneClasses(tone: string) {
  const tones: Record<string, string> = {
    teal: "bg-teal-50 text-teal-800 ring-teal-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    red: "bg-red-50 text-red-800 ring-red-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return tones[tone] ?? tones.slate;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function AdminPage() {
  const dashboard = await getDashboardData();

  const pendingActions = [
    {
      title: "Bayi başvurularını incele",
      description:
        "Yeni başvuruları inceleyin, ticari koşulları belirleyin ve firma hesabını açın.",
      value: dashboard.metrics[0].value,
      label: "bekleyen kayıt",
      href: "/admin/bayi-basvurulari",
    },
    {
      title: "Stok alarmı olan ürünleri kontrol et",
      description: "Stok satırları ürün yönetimi ekranından güncellenebilir.",
      value: dashboard.metrics[3].value,
      label: "stok uyarısı",
      href: "/admin/urunler",
    },
    {
      title: "Sipariş operasyonunu yönet",
      description:
        "Yeni siparişleri, stok rezervasyonlarını ve teslimat bilgilerini inceleyin.",
      value: dashboard.metrics[1].value + dashboard.metrics[2].value,
      label: "operasyon kalemi",
      href: "/admin/siparisler",
    },
  ];

  return (
    <div className="grid gap-6">
      <section className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-800">
            Operasyon merkezi
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Satış, bayi, stok ve sevkiyat akışı
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Bu ekran bekleyen işleri tek yerde toplar. Henüz aktif olmayan
            modüller roadmap sırasına göre açılacak; aktif veri ürün, stok, CMS,
            audit ve başvuru kayıtlarından gelir.
          </p>
        </div>
        <Link
          href="/admin/urunler"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900"
        >
          Ürünleri yönet
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {dashboard.metrics.map((metric) => {
          const Icon = metric.icon;
          const content = (
            <article className={`${panelClass} h-full p-4`}>
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-md ring-1 ${toneClasses(metric.tone)}`}
                >
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span className="text-2xl font-semibold text-slate-950">
                  {metric.value}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-800">
                {metric.label}
              </p>
            </article>
          );

          return metric.href ? (
            <Link
              key={metric.label}
              href={metric.href}
              className="block transition hover:-translate-y-0.5"
            >
              {content}
            </Link>
          ) : (
            <div key={metric.label}>{content}</div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className={panelClass}>
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">
              Bekleyen aksiyonlar
            </h3>
          </div>
          <div className="divide-y divide-slate-200">
            {pendingActions.map((action) => (
              <div
                key={action.title}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">
                    {action.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {action.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-right">
                    <span className="block text-xl font-semibold text-slate-950">
                      {action.value}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {action.label}
                    </span>
                  </span>
                  {action.href ? (
                    <Link
                      href={action.href}
                      className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Aç
                    </Link>
                  ) : (
                    <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                      Yakında
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={panelClass}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">
              Stok alarm listesi
            </h3>
            <Link
              href="/admin/urunler"
              className="text-sm font-semibold text-teal-800"
            >
              Ürünlere git
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {dashboard.lowStockItems.length > 0 ? (
              dashboard.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {item.product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.product.code} · {item.warehouseCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      {item.quantity - item.reservedQuantity} uygun
                    </span>
                    <span className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">
                Stok alarmı yok.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_0.8fr]">
        <div className={panelClass}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">
              Son bayi başvuruları
            </h3>
            <Link
              href="/admin/bayi-basvurulari"
              className="text-sm font-semibold text-teal-800"
            >
              Tümünü aç
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {dashboard.recentApplications.length > 0 ? (
              dashboard.recentApplications.map((application) => (
                <Link
                  key={application.id}
                  href={`/admin/bayi-basvurulari/${application.id}`}
                  className="block px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {application.companyName}
                    </p>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {getStatusLabel(application.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {application.contactName} · {application.city} ·{" "}
                    {formatDate(application.createdAt)}
                  </p>
                </Link>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">
                Henüz başvuru yok.
              </p>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">
              Son audit hareketleri
            </h3>
          </div>
          <div className="divide-y divide-slate-200">
            {dashboard.recentAuditLogs.length > 0 ? (
              dashboard.recentAuditLogs.map((log) => (
                <div key={log.id} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-teal-800">
                      <ShieldCheck size={16} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {log.action}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {log.actor?.name ?? "Sistem"} ·{" "}
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">
                Audit hareketi yok.
              </p>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">
              Entegrasyon sağlığı
            </h3>
          </div>
          <div className="grid gap-3 p-5">
            {dashboard.shippingProviders.length > 0 ? (
              dashboard.shippingProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="rounded-md border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">
                      {provider.name}
                    </p>
                    <span
                      className={
                        provider.isActive
                          ? "rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800"
                          : "rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"
                      }
                    >
                      {provider.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {provider.providerType}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Kargo sağlayıcı kaydı yok.
              </p>
            )}
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              City Lojistik canlı API dokümanı ve test hesabı gelmeden canlı
              gönderi akışı açılmayacak.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
