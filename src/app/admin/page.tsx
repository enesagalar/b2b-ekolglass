import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ClipboardCheck,
  Factory,
  FileText,
  Truck,
  UsersRound,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const iconMap = {
  BarChart3,
  Boxes,
  ClipboardCheck,
  FileText,
  Truck,
  UsersRound,
};

async function getAdminMetrics() {
  const [pendingDealers, openQuotes, newOrders, lowStock, readyShipments, widgets] = await Promise.all([
    prisma.dealerApplication.count({ where: { status: { in: ["NEW", "IN_REVIEW"] } } }),
    prisma.quoteRequest.count({ where: { status: { in: ["NEW", "IN_REVIEW", "PRICED", "OFFER_SENT"] } } }),
    prisma.order.count({ where: { status: { in: ["SUBMITTED", "WAITING_FOR_APPROVAL", "CONFIRMED"] } } }),
    prisma.stockItem.count({ where: { status: { in: ["LOW_STOCK", "OUT_OF_STOCK"] } } }),
    prisma.order.count({ where: { status: "READY_FOR_SHIPMENT" } }),
    prisma.dashboardWidget.findMany({
      where: { isActive: true },
      orderBy: [{ role: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  const metricValues: Record<string, string> = {
    NEW_DEALER_APPLICATIONS: String(pendingDealers),
    OPEN_QUOTES: String(openQuotes),
    NEW_ORDERS: String(newOrders),
    LOW_STOCK: String(lowStock),
    READY_FOR_SHIPMENT: String(readyShipments),
    MONTHLY_SALES: "ERP bekliyor",
  };

  return {
    cards: [
      { label: "Onay bekleyen bayi", value: String(pendingDealers), icon: UsersRound },
      { label: "Açık teklif talebi", value: String(openQuotes), icon: FileText },
      { label: "Yeni sipariş", value: String(newOrders), icon: ClipboardCheck },
      { label: "Düşük stok alarmı", value: String(lowStock), icon: Boxes },
      { label: "Sevke hazır", value: String(readyShipments), icon: Truck },
      { label: "Aylık satış görünümü", value: "ERP bekliyor", icon: BarChart3 },
    ],
    widgets: widgets.map((widget) => ({
      ...widget,
      value: metricValues[widget.metricKey] ?? "-",
      icon: iconMap[widget.icon as keyof typeof iconMap] ?? BarChart3,
    })),
  };
}

export default async function AdminPage() {
  const metrics = await getAdminMetrics();

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <Factory size={22} className="text-teal-800" aria-hidden="true" />
            <span className="font-semibold text-slate-950">EkolGlass Admin</span>
          </div>
          <Link href="/" className="text-sm font-medium text-slate-600">
            Portala dön
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-teal-800">Operasyon paneli</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Satış, bayi, stok ve teklif takibi</h1>
          </div>
          <Link
            href="/admin/icerik"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
          >
            CMS içeriklerini yönet
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {metrics.cards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <Icon size={20} className="text-teal-800" aria-hidden="true" />
                  <span className="text-2xl font-semibold text-slate-950">{item.value}</span>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-700">{item.label}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Role göre dashboard widgetları</h2>
            <div className="mt-5 grid gap-3">
              {metrics.widgets.map((widget) => {
                const Icon = widget.icon;
                return (
                  <div key={widget.key} className="flex items-center justify-between rounded-md border border-slate-200 p-4">
                    <div className="flex items-center gap-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded bg-teal-50 text-teal-800">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{widget.title}</p>
                        <p className="text-xs text-slate-500">{widget.role}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{widget.value}</span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Admin/CMS ayrımı</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bu panel operasyon dashboard temelidir. İçerik, sayfa blokları ve medya `Page`, `PageBlock`,
              `MediaAsset` ve `SiteSetting` modelleriyle ayrıldı; uzun vadede Payload CMS veya ayrı admin
              subdomain üstünden yönetilecek.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
