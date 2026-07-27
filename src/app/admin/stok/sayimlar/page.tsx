import { randomUUID } from "node:crypto";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  History,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { getStockCountWorkspace } from "@/data/admin-stock-counts";
import { StockCountOpenForm } from "@/features/stock-count/stock-count-open-form";
import { StockCountSessionActions } from "@/features/stock-count/stock-count-session-actions";
import { requirePermissionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

const statusMeta = {
  APPLIED: {
    label: "Stoğa uygulandı",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    icon: CheckCircle2,
  },
  STALE: {
    label: "İnceleme gerekli",
    className: "bg-amber-50 text-amber-900 ring-amber-200",
    icon: AlertTriangle,
  },
  CANCELLED: {
    label: "İptal edildi",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    icon: XCircle,
  },
} as const;

export default async function AdminStockCountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requirePermissionUser("stock.count", "/admin/stok/sayimlar");
  const query = first((await searchParams).q)?.trim() ?? "";
  const workspace = await getStockCountWorkspace(query);
  const reviewCount = workspace.recentSessions.filter(
    (session) => session.status === "STALE",
  ).length;

  return (
    <div className="grid min-w-0 gap-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div>
          <Link
            href="/admin/stok"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Stok merkezine dön
          </Link>
          <p className="mt-4 text-sm font-semibold text-teal-800">
            Depo operasyonu
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Fiziksel stok sayımı
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Ürün ve depo için sayım oturumu açın, fiziksel sonucu kaydedin ve
            oluşan farkı hareket defteriyle birlikte izleyin.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <ShieldCheck size={18} className="text-teal-800" aria-hidden="true" />
          Rezerve stok korunur
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <Clock3 size={18} className="text-teal-800" aria-hidden="true" />
          <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">
            {workspace.openSessions.length}
          </p>
          <p className="mt-1 text-sm text-slate-600">Açık sayım</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <AlertTriangle
            size={18}
            className="text-amber-700"
            aria-hidden="true"
          />
          <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">
            {reviewCount}
          </p>
          <p className="mt-1 text-sm text-slate-600">Son 20 kayıtta inceleme</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <History size={18} className="text-slate-600" aria-hidden="true" />
          <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">
            {workspace.recentSessions.length}
          </p>
          <p className="mt-1 text-sm text-slate-600">Görüntülenen geçmiş</p>
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-semibold text-slate-950">Yeni sayım başlat</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Sayım yapacağınız ürünün doğru depo kaydını seçin.
          </p>
          <form className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Sayılacak stok kaydını ara</span>
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-3 text-slate-400"
                aria-hidden="true"
              />
              <input
                name="q"
                defaultValue={query}
                placeholder="Ürün kodu veya adı"
                className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-700"
              />
            </label>
            <button className="min-h-11 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-800">
              Stok kayıtlarını getir
            </button>
          </form>
        </div>
        <div className="p-5">
          <StockCountOpenForm
            candidates={workspace.candidates}
            initialIdempotencyKey={randomUUID()}
          />
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h3 className="font-semibold text-slate-950">Açık sayımlar</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Önce raftaki toplam adedi sayın, ardından sonucu ve gerekçeyi
            kaydedin.
          </p>
        </div>

        {workspace.openSessions.length ? (
          workspace.openSessions.map((session) => (
            <article
              key={session.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <div className="grid gap-4 border-b border-slate-200 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/urunler/${session.productId}?tab=stok`}
                      className="font-semibold text-teal-800 hover:text-teal-700"
                    >
                      {session.productCode}
                    </Link>
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
                      Açık
                    </span>
                    <span className="text-xs text-slate-400">
                      {session.countNumber}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {session.product.name}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {session.warehouse.name} ({session.warehouseCode}) ·{" "}
                    {formatDate(session.createdAt)} · {session.openedBy.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:text-right">
                  <div>
                    <p className="text-xs text-slate-500">Sistem bakiyesi</p>
                    <p className="mt-1 font-semibold tabular-nums text-slate-950">
                      {session.expectedQuantity.toLocaleString("tr-TR")} adet
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Rezerve</p>
                    <p className="mt-1 font-semibold tabular-nums text-slate-950">
                      {session.expectedReservedQuantity.toLocaleString("tr-TR")}{" "}
                      adet
                    </p>
                  </div>
                </div>
              </div>

              {session.balanceChanged ? (
                <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 sm:px-5">
                  <AlertTriangle
                    size={17}
                    className="mt-1 shrink-0"
                    aria-hidden="true"
                  />
                  Bu oturum açıldıktan sonra stok bakiyesi değişti. Sonuç
                  kaydedilir ancak güvenlik nedeniyle stoğa uygulanmayabilir;
                  güncel bakiye ile yeni sayım gerekebilir.
                </div>
              ) : null}

              <div className="p-4 sm:p-5">
                <StockCountSessionActions
                  sessionId={session.id}
                  expectedQuantity={session.expectedQuantity}
                  reservedQuantity={session.expectedReservedQuantity}
                  completionIdempotencyKey={randomUUID()}
                  cancellationIdempotencyKey={randomUUID()}
                />
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <ClipboardCheck
              size={22}
              className="mx-auto text-slate-400"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-semibold text-slate-800">
              Bekleyen sayım yok
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Yeni bir ürün ve depo seçerek sayım oturumu açabilirsiniz.
            </p>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-semibold text-slate-950">Son sayım kayıtları</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            En son 20 tamamlanan, incelemeye alınan veya iptal edilen oturum.
          </p>
        </div>

        {workspace.recentSessions.length ? (
          <div className="divide-y divide-slate-200">
            {workspace.recentSessions.map((session) => {
              const meta =
                statusMeta[session.status as keyof typeof statusMeta];
              const StatusIcon = meta.icon;
              const eventAt = session.submittedAt ?? session.cancelledAt;
              const actor =
                session.submittedBy?.name ??
                session.cancelledBy?.name ??
                session.openedBy.name;
              const reason =
                session.submissionReason ??
                session.cancellationReason ??
                "Gerekçe kaydedilmedi.";

              return (
                <article
                  key={session.id}
                  className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/urunler/${session.productId}?tab=stok`}
                        className="font-semibold text-teal-800 hover:text-teal-700"
                      >
                        {session.productCode}
                      </Link>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.className}`}
                      >
                        <StatusIcon size={13} aria-hidden="true" />
                        {meta.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {session.countNumber}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-slate-800">
                      {session.product.name}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {reason}
                    </p>
                    {session.status === "STALE" ? (
                      <p className="mt-1 text-xs font-medium text-amber-800">
                        {session.staleCode === "COUNT_BELOW_RESERVED"
                          ? "Sayılan miktar rezerve stoktan düşük olduğu için uygulanmadı."
                          : "Oturum sırasında stok değiştiği için uygulanmadı."}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-sm lg:min-w-72 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    <div>
                      <p className="text-xs text-slate-500">Sistem / sayılan</p>
                      <p className="mt-1 font-semibold tabular-nums text-slate-950">
                        {session.expectedQuantity.toLocaleString("tr-TR")} /{" "}
                        {session.countedQuantity === null
                          ? "—"
                          : session.countedQuantity.toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Fark</p>
                      <p
                        className={`mt-1 font-semibold tabular-nums ${
                          (session.differenceQuantity ?? 0) === 0
                            ? "text-slate-700"
                            : (session.differenceQuantity ?? 0) > 0
                              ? "text-emerald-700"
                              : "text-red-700"
                        }`}
                      >
                        {session.differenceQuantity === null
                          ? "—"
                          : `${session.differenceQuantity > 0 ? "+" : ""}${session.differenceQuantity.toLocaleString("tr-TR")}`}
                      </p>
                    </div>
                    <p className="col-span-2 text-xs leading-5 text-slate-500">
                      {session.warehouse.name} ·{" "}
                      {eventAt ? formatDate(eventAt) : "Tarih yok"} · {actor}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="p-10 text-center text-sm text-slate-500">
            Henüz sonuçlandırılmış sayım kaydı yok.
          </p>
        )}
      </section>
    </div>
  );
}
