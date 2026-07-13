import Link from "next/link";
import { ArrowLeft, CheckCircle2, PackageSearch } from "lucide-react";
import { notFound } from "next/navigation";

import { requireDealerContext } from "@/data/dealer-context";
import { getDealerQuoteDetail } from "@/data/dealer-portal";
import { formatPortalDate, PortalStatus } from "@/features/dealer/dealer-ui";

export const dynamic = "force-dynamic";

function money(value: { toString(): string } | null, currency: string) { return value ? `${currency} ${Number(value.toString()).toLocaleString("tr-TR", {minimumFractionDigits:2,maximumFractionDigits:2})}` : "Fiyatlandırılacak"; }

export default async function DealerQuoteDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ id }, query, { company }] = await Promise.all([params, searchParams, requireDealerContext("/bayi/teklifler")]);
  const quote = await getDealerQuoteDetail(company.id, id);
  if (!quote) notFound();
  return <div className="grid gap-6">
    {query.created === "1" ? <section className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="shrink-0" size={22}/><div><h2 className="font-semibold">Teklif talebiniz alındı</h2><p className="mt-1 text-sm">Referans numaranız: <strong>{quote.quoteNumber}</strong></p></div></section> : null}
    <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-teal-800">{company.displayName}</p><h2 className="mt-1 text-2xl font-semibold md:text-3xl">{quote.quoteNumber}</h2><div className="mt-3 flex items-center gap-3"><PortalStatus status={quote.status}/><span className="text-xs text-slate-500">{formatPortalDate(quote.createdAt)}</span></div></div><Link href="/bayi/teklifler" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold"><ArrowLeft size={17}/>Tüm teklifler</Link></section>
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start"><section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h3 className="font-semibold">Talep kalemleri</h3></div><div className="divide-y divide-slate-200">{quote.items.map(item=><article key={item.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto]"><div><p className="font-mono text-xs font-semibold text-teal-800">{item.product?.code ?? "ÖZEL"}</p><h4 className="mt-1 font-semibold">{item.product?.name ?? "Özel üretim talebi"}</h4><p className="mt-2 text-xs text-slate-500">{item.quantity} adet · {item.glassType ?? "Cam tipi teyit edilecek"} · {item.dimensions ?? "Ölçü teyit edilecek"}</p>{item.notes?<p className="mt-2 text-sm text-slate-600">{item.notes}</p>:null}</div><div className="sm:text-right"><p className="text-sm font-semibold">{money(item.lineTotal,quote.currency)}</p><p className="mt-1 text-xs text-slate-500">Birim: {money(item.unitPrice,quote.currency)}</p></div></article>)}</div></section>
      <aside className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div><p className="text-xs font-semibold uppercase text-slate-500">İletişim</p><p className="mt-2 text-sm font-semibold">{quote.requesterName}</p><p className="mt-1 text-sm text-slate-600">{quote.requesterEmail}</p>{quote.requesterPhone?<p className="mt-1 text-sm text-slate-600">{quote.requesterPhone}</p>:null}</div><div className="border-t border-slate-200 pt-4"><p className="text-xs font-semibold uppercase text-slate-500">İstenen teslim</p><p className="mt-2 text-sm">{formatPortalDate(quote.desiredDeliveryDate)}</p></div><div className="border-t border-slate-200 pt-4"><p className="text-xs font-semibold uppercase text-slate-500">Katalog tahmini</p><p className="mt-2 text-lg font-semibold">{money(quote.estimatedSubtotal,quote.currency)}</p>{quote.hasUnpricedItems?<p className="mt-1 text-xs text-amber-700">Bazı kalemler satış ekibi tarafından fiyatlandırılacak.</p>:null}</div>{quote.notes?<div className="border-t border-slate-200 pt-4"><p className="text-xs font-semibold uppercase text-slate-500">Talep notu</p><p className="mt-2 text-sm leading-6 text-slate-600">{quote.notes}</p></div>:null}<Link href="/bayi/urunler" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-800 px-3 text-sm font-semibold text-white"><PackageSearch size={16}/>Ürünlere dön</Link></aside>
    </div>
  </div>;
}
