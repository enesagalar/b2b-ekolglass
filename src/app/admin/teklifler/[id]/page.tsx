import { randomUUID } from "node:crypto";

import { ArrowLeft, Building2, CalendarDays, Mail, PackageCheck, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminQuoteDetail } from "@/data/admin-quotes";
import {
  getAllowedQuoteTransitions,
  getQuoteTransitionPermission,
  isQuoteStatus,
} from "@/domain/quote-transitions";
import { hasPermission, isKnownRole } from "@/domain/roles";
import {
  formatPortalDate,
  formatPortalMoney,
  PortalStatus,
} from "@/features/dealer/dealer-ui";
import {
  AdminQuotePricingForm,
  AdminQuoteConversionForm,
  AdminQuoteStatusForm,
} from "@/features/quotes/admin-quote-forms";
import { requirePermissionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";

export default async function AdminQuoteDetailPage({
  params,
}: PageProps<"/admin/teklifler/[id]">) {
  const { id } = await params;
  const actor = await requirePermissionUser("quote.review", `/admin/teklifler/${id}`);
  const quote = await getAdminQuoteDetail(id);
  if (!quote) notFound();
  const role = isKnownRole(actor.role) ? actor.role : null;
  const status = isQuoteStatus(quote.status) ? quote.status : null;
  const canPrice = Boolean(role && hasPermission(role, "quote.price"));
  const canConvert = Boolean(role && hasPermission(role, "quote.convert"));
  const transitions = status
    ? getAllowedQuoteTransitions(status)
        .filter((target) => target !== "PRICED")
        .filter((target) => Boolean(role && hasPermission(role, getQuoteTransitionPermission(target))))
    : [];
  const pricingOpen = Boolean(
    canPrice && ["IN_REVIEW", "PRICED", "OFFER_SENT"].includes(quote.status),
  );
  const offerPrices = new Map(
    quote.activeOfferRevision?.items.map((item) => [
      item.quoteRequestItemId,
      item,
    ]) ?? [],
  );
  const displayCurrency = quote.activeOfferRevision?.currency ?? quote.currency;

  return (
    <div className="grid gap-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end">
        <div>
          <Link href="/admin/teklifler" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16} />Teklif listesine dön</Link>
          <div className="mt-4 flex flex-wrap items-center gap-3"><h2 className="break-all text-2xl font-semibold">{quote.quoteNumber}</h2><PortalStatus status={quote.status} /></div>
          <p className="mt-2 text-sm text-slate-500">{formatPortalDate(quote.submittedAt ?? quote.createdAt)} · {quote.items.length} kalem · Sürüm {quote.version}</p>
        </div>
        {quote.company ? <Link href={`/admin/firmalar/${quote.company.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold"><Building2 size={16} />Firma kartını aç</Link> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="grid gap-6">
          <section className={`${panelClass} overflow-hidden`}>
            <div className="border-b border-slate-200 px-5 py-4"><h3 className="font-semibold">Teklif kalemleri</h3></div>
            <div className="divide-y divide-slate-200">
              {quote.items.map((item) => {
                const offerPrice = offerPrices.get(item.id);
                return (
                <article key={item.id} className="p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div><p className="font-mono text-xs font-semibold text-teal-800">{item.product?.code ?? "ÖZEL"}</p><h4 className="mt-1 font-semibold">{item.product?.name ?? item.customTitle ?? "Özel teklif kalemi"}</h4><p className="mt-2 text-xs text-slate-500">{item.quantity} adet · {item.glassType || "Cam tipi yok"} · {item.dimensions || "Ölçü yok"}</p>{item.notes ? <p className="mt-2 text-sm text-slate-600">{item.notes}</p> : null}</div>
                    <div className="sm:text-right"><p className="font-semibold">{offerPrice ? formatPortalMoney(offerPrice.lineTotal, displayCurrency) : item.lineTotal ? formatPortalMoney(item.lineTotal, quote.currency) : "Fiyat bekliyor"}</p><p className="mt-1 text-xs text-slate-500">Birim: {offerPrice ? formatPortalMoney(offerPrice.unitPrice, displayCurrency) : item.unitPrice ? formatPortalMoney(item.unitPrice, quote.currency) : "-"}</p><p className="mt-1 text-xs text-slate-500">{offerPrice ? `Aktif teklif revizyonu ${quote.activeOfferRevision?.revisionNumber}` : `Katalog kaynağı: ${item.priceScope ?? "-"}`}</p></div>
                  </div>
                </article>
                );
              })}
            </div>
            <div className="flex justify-between border-t border-slate-200 bg-slate-50 px-5 py-4"><span className="text-sm font-semibold text-slate-600">{quote.activeOfferRevision ? `Teklif toplamı · Revizyon ${quote.activeOfferRevision.revisionNumber}` : "Katalog tahmini"}</span><strong>{quote.activeOfferRevision ? formatPortalMoney(quote.activeOfferRevision.subtotal, quote.activeOfferRevision.currency) : quote.estimatedSubtotal ? formatPortalMoney(quote.estimatedSubtotal, quote.currency) : "Henüz tamamlanmadı"}</strong></div>
          </section>

          {pricingOpen && status ? (
            <section className={`${panelClass} p-5`}>
              <div className="mb-4"><h3 className="font-semibold">Kalem fiyatlandırma</h3><p className="mt-1 text-sm text-slate-500">Kaydetme sırasında tüm toplamlar sunucuda yeniden hesaplanır.</p></div>
              <AdminQuotePricingForm quoteId={quote.id} expectedStatus={status} expectedVersion={quote.version} idempotencyKey={randomUUID()} currency={displayCurrency} internalNotes={quote.internalNotes} items={quote.items.map((item) => ({ id: item.id, code: item.product?.code ?? "ÖZEL", name: item.product?.name ?? item.customTitle ?? "Özel kalem", quantity: item.quantity, unitPrice: offerPrices.get(item.id)?.unitPrice.toString() ?? item.unitPrice?.toString() ?? null }))} />
            </section>
          ) : null}

          <section className={`${panelClass} p-5`}>
            <h3 className="font-semibold">Operasyon geçmişi</h3>
            <div className="mt-4 grid gap-3">
              {quote.statusHistory.length ? quote.statusHistory.map((entry) => <article key={entry.id} className="border-l-2 border-teal-700 pl-4"><p className="text-sm font-semibold">{entry.fromStatus ?? "Başlangıç"} → {entry.toStatus}</p><p className="mt-1 text-xs text-slate-500">{entry.changedBy?.name ?? entry.changedBy?.email ?? "Sistem"} · {formatPortalDate(entry.createdAt)}</p>{entry.note ? <p className="mt-1 text-sm text-slate-600">{entry.note}</p> : null}</article>) : <p className="text-sm text-slate-500">Henüz durum değişikliği yok.</p>}
            </div>
          </section>
        </div>

        <aside className="grid gap-6 xl:sticky xl:top-28">
          {quote.convertedOrder ? (
            <section className={`${panelClass} p-5`}>
              <p className="text-xs font-semibold uppercase text-slate-500">Oluşan sipariş</p>
              <p className="mt-2 font-semibold">{quote.convertedOrder.orderNumber}</p>
              <Link href={`/admin/siparisler/${quote.convertedOrder.id}`} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-800 px-3 text-sm font-semibold text-white"><PackageCheck size={16} />Siparişi aç</Link>
            </section>
          ) : canConvert && quote.status === "APPROVED" && quote.activeOfferRevision && quote.company?.addresses.length ? (
            <section className={`${panelClass} p-5`}>
              <h3 className="font-semibold">Siparişe dönüştür</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Aktif teklif revizyonu siparişe kopyalanır ve uygun stoklar ayrılır.</p>
              <div className="mt-4"><AdminQuoteConversionForm quoteId={quote.id} expectedVersion={quote.version} expectedOfferRevisionId={quote.activeOfferRevision.id} idempotencyKey={randomUUID()} addresses={quote.company.addresses} /></div>
            </section>
          ) : canConvert && quote.status === "APPROVED" ? (
            <section className={`${panelClass} p-5`}><h3 className="font-semibold">Siparişe dönüştür</h3><p className="mt-2 text-sm leading-6 text-amber-700">Dönüşüm için firmaya ait en az bir teslimat adresi ve aktif teklif revizyonu gerekir.</p></section>
          ) : null}
          <section className={`${panelClass} p-5`}><h3 className="font-semibold">Durum yönetimi</h3><div className="mt-4">{status && transitions.length ? <AdminQuoteStatusForm quoteId={quote.id} expectedStatus={status} expectedVersion={quote.version} idempotencyKey={randomUUID()} transitions={transitions} /> : <p className="text-sm leading-6 text-slate-500">Bu hesap için kullanılabilir bir sonraki durum aksiyonu yok.</p>}</div></section>
          <section className={`${panelClass} p-5`}><p className="text-xs font-semibold uppercase text-slate-500">Firma ve talep sahibi</p><p className="mt-3 font-semibold">{quote.company?.displayName ?? "Firma kaydı yok"}</p><p className="mt-1 text-sm text-slate-600">{quote.requesterName}</p><div className="mt-4 grid gap-2 text-sm text-slate-600"><p className="flex items-center gap-2 break-all"><Mail size={15} />{quote.requesterEmail}</p>{quote.requesterPhone ? <p className="flex items-center gap-2"><Phone size={15} />{quote.requesterPhone}</p> : null}{quote.desiredDeliveryDate ? <p className="flex items-center gap-2"><CalendarDays size={15} />{formatPortalDate(quote.desiredDeliveryDate)}</p> : null}</div></section>
          <section className={`${panelClass} p-5`}><p className="text-xs font-semibold uppercase text-slate-500">Bayi notu</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{quote.notes || "Not iletilmedi."}</p>{quote.internalNotes ? <><p className="mt-5 text-xs font-semibold uppercase text-slate-500">İç not</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{quote.internalNotes}</p></> : null}</section>
        </aside>
      </div>
    </div>
  );
}
