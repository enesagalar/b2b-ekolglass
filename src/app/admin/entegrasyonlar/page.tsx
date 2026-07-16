import Link from "next/link";
import { randomUUID } from "node:crypto";
import {
  Activity,
  AlertTriangle,
  CircleCheck,
  Filter,
  LoaderCircle,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";

import {
  getAdminIntegrationOverview,
  outboxStatuses,
} from "@/data/admin-integrations";
import {
  integrationTopicLabels,
  isReplayableOutboxTopic,
} from "@/domain/integration-topics";
import { hasPermission, isKnownRole } from "@/domain/roles";
import { OutboxReplayForm } from "@/features/integrations/outbox-replay-form";
import { requirePermissionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const pageSize = 25;
const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";
const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700";
const outboxStatusLabels: Record<string, string> = {
  PENDING: "Bekliyor",
  PROCESSING: "İşleniyor",
  RETRY: "Tekrar denenecek",
  SUCCEEDED: "Başarılı",
  DEAD: "Müdahale gerekli",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatIntegrationDate(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function statusClass(status: string) {
  if (status === "SUCCEEDED") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "DEAD") return "bg-red-50 text-red-800 ring-red-200";
  if (status === "RETRY") return "bg-amber-50 text-amber-900 ring-amber-200";
  if (status === "PROCESSING") return "bg-blue-50 text-blue-800 ring-blue-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function pageHref(query: string, status: string, topic: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  if (topic) params.set("topic", topic);
  params.set("page", String(page));
  return `/admin/entegrasyonlar?${params.toString()}`;
}

export default async function AdminIntegrationsPage({
  searchParams,
}: PageProps<"/admin/entegrasyonlar">) {
  const actor = await requirePermissionUser(
    "integration.read",
    "/admin/entegrasyonlar",
  );
  const params = await searchParams;
  const query = first(params.q)?.trim().slice(0, 100) ?? "";
  const requestedStatus = first(params.status)?.trim() ?? "";
  const status = (outboxStatuses as readonly string[]).includes(requestedStatus)
    ? requestedStatus
    : "";
  const topic = first(params.topic)?.trim().slice(0, 120) ?? "";
  const requestedPage = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const data = await getAdminIntegrationOverview({
    query,
    status,
    topic,
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const canReplay =
    isKnownRole(actor.role) && hasPermission(actor.role, "integration.replay");
  const metrics = [
    { label: "Hazır kuyruk", value: data.health.ready, icon: Activity, tone: "bg-blue-50 text-blue-800" },
    { label: "İşleniyor", value: data.health.processing, icon: LoaderCircle, tone: "bg-violet-50 text-violet-800" },
    { label: "Tekrar denenecek", value: data.health.retry, icon: RotateCcw, tone: "bg-amber-50 text-amber-900" },
    { label: "Müdahale gerekli", value: data.health.dead, icon: AlertTriangle, tone: "bg-red-50 text-red-800" },
    { label: "İşleyici bekleyen", value: data.health.unsupportedReady, icon: AlertTriangle, tone: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-800">Sistem operasyonu</p>
          <h2 className="mt-1 text-2xl font-semibold">Entegrasyon kuyruğu</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            E-posta ve kargo olaylarını teslim durumuna göre izleyin; kalıcı hataları audit kayıtlı ve kontrollü biçimde yeniden kuyruğa alın.
          </p>
        </div>
        <div className={`inline-flex min-h-10 items-center gap-2 self-start rounded-md px-3 py-2 text-sm font-semibold ring-1 ${data.health.status === "ok" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : data.health.status === "empty" ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-amber-50 text-amber-900 ring-amber-200"}`}>
          {data.health.status === "ok" ? <CircleCheck size={17} /> : <AlertTriangle size={17} />}
          {data.health.status === "ok" ? "Kuyruk sağlıklı" : data.health.status === "empty" ? "Henüz teslimat olayı yok" : `${data.health.overdue} gecikmiş · ${data.health.unsupportedReady} işleyicisiz`}
        </div>
      </section>

      <section className={`${panelClass} overflow-hidden`} data-testid="city-logistics-readiness">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800">
              <Truck size={21} />
            </span>
            <div>
              <p className="text-sm font-semibold text-teal-800">Kargo sağlayıcısı</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">City Lojistik aktivasyon hazırlığı</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                Türkiye servisine ait doğrulanmış API sözleşmesi ve test hesabı gelene kadar dış ağ aktarımı kapalı tutulur.
              </p>
            </div>
          </div>
          <span className="inline-flex min-h-9 shrink-0 items-center gap-2 self-start rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle size={16} /> Canlı aktarım kilitli · {data.manualCityShipmentCount} manuel sevk
          </span>
        </div>
        <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
          {data.cityLogistics.checks.map((check) => (
            <div key={check.key} className="bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${check.status === "ready" ? "bg-emerald-500" : check.status === "blocked" ? "bg-amber-500" : "bg-slate-300"}`} />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{check.detail}</p>
            </div>
          ))}
        </div>
        {data.manualCityShipments.length ? (
          <div className="border-t border-slate-200 px-5 py-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Manuel işlem bekleyen siparişler</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.manualCityShipments.map((shipment) => (
                <Link
                  key={shipment.id}
                  href={`/admin/siparisler/${shipment.orderId}`}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-teal-700 hover:text-teal-800"
                >
                  {shipment.order.orderNumber}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-2 bg-slate-50 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>Resmi iletişim: <a className="font-semibold text-teal-800 underline-offset-4 hover:underline" href="mailto:info@citylojistik.com">info@citylojistik.com</a> · 0850 259 24 89</p>
          <p className="text-xs font-semibold text-slate-500">Teknik sözleşme bekleniyor</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className={`${panelClass} p-4`}>
              <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-md ${metric.tone}`}><Icon size={19} /></span>
                <strong className="text-2xl">{metric.value}</strong>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">{metric.label}</p>
            </article>
          );
        })}
      </section>

      <section className={`${panelClass} min-w-0 overflow-hidden`}>
        <form className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_180px_260px_auto]">
          <label className="relative">
            <span className="sr-only">Outbox kayıtlarında ara</span>
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} />
            <input name="q" defaultValue={query} className={`${inputClass} pl-10`} placeholder="Olay, aggregate veya idempotency anahtarı" />
          </label>
          <label>
            <span className="sr-only">Teslim durumu</span>
            <select name="status" defaultValue={status} className={inputClass}>
              <option value="">Tüm durumlar</option>
              {outboxStatuses.map((item) => <option key={item} value={item}>{outboxStatusLabels[item]}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Entegrasyon konusu</span>
            <select name="topic" defaultValue={topic} className={inputClass}>
              <option value="">Tüm entegrasyon konuları</option>
              {data.topics.map((item) => <option key={item} value={item}>{integrationTopicLabels[item] ?? item}</option>)}
            </select>
          </label>
          <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">
            <Filter size={16} /> Filtrele
          </button>
        </form>

        {data.events.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Olay</th>
                  <th className="px-5 py-3">İş kaydı</th>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3">Deneme</th>
                  <th className="px-5 py-3">Sonuç / hata</th>
                  <th className="px-5 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.events.map((event) => {
                  const replayable = canReplay && data.emailWorkerEnabled && ["DEAD", "RETRY"].includes(event.status) && isReplayableOutboxTopic(event.topic);
                  return (
                    <tr key={event.id} className="align-top hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-950">{integrationTopicLabels[event.topic] ?? event.eventType}</p>
                        <p className="mt-1 max-w-72 break-all font-mono text-[11px] text-slate-500">{event.topic}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold">{event.aggregateType}</p>
                        <p className="mt-1 max-w-56 break-all font-mono text-xs text-slate-500">{event.aggregateId}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatIntegrationDate(event.createdAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusClass(event.status)}`}>{outboxStatusLabels[event.status] ?? event.status}</span>
                        {event.providerCode ? <p className="mt-2 text-xs text-slate-500">{event.providerCode}</p> : null}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <p className="font-semibold">{event.attempts} / {event.maxAttempts}</p>
                        <p className="mt-1 text-xs text-slate-500">Uygun: {formatIntegrationDate(event.availableAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        {event.lastError ? <p className="max-w-80 text-sm leading-5 text-red-700">{event.lastError}</p> : <p className="text-sm text-slate-500">{event.logs[0] ? `${event.logs[0].status} · ${formatIntegrationDate(event.logs[0].createdAt)}` : "Henüz sonuç yok"}</p>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {replayable ? (
                          <OutboxReplayForm
                            eventId={event.id}
                            requestId={randomUUID()}
                            status={event.status as "DEAD" | "RETRY"}
                            attempts={event.attempts}
                            updatedAt={event.updatedAt.toISOString()}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">
                            {!isReplayableOutboxTopic(event.topic) || !data.emailWorkerEnabled
                              ? "İşleyici yok"
                              : "İşlem yok"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-slate-500">Filtrelerle eşleşen entegrasyon olayı bulunamadı.</p>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm">
          <p className="text-slate-500">{data.total} olay · Sayfa {page}/{totalPages}</p>
          <div className="flex gap-2">
            {page > 1 ? <Link href={pageHref(query, status, topic, page - 1)} className="rounded-md border border-slate-300 px-3 py-2 font-semibold">Önceki</Link> : null}
            {page < totalPages ? <Link href={pageHref(query, status, topic, page + 1)} className="rounded-md border border-slate-300 px-3 py-2 font-semibold">Sonraki</Link> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
