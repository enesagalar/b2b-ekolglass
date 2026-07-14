import Link from "next/link";
import { FileText, PackageSearch } from "lucide-react";

import { requireDealerContext } from "@/data/dealer-context";
import { getDealerQuotes } from "@/data/dealer-portal";
import { formatPortalDate, PortalStatus } from "@/features/dealer/dealer-ui";

export const dynamic = "force-dynamic";

export default async function DealerQuotesPage() {
  const { company } = await requireDealerContext("/bayi/teklifler");
  const quotes = await getDealerQuotes(company.id);

  return (
    <div className="grid min-w-0 gap-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-800">{company.displayName}</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">Teklif arşivi</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Daha önce oluşturulan teklif kayıtlarınızı ve bunlardan oluşan siparişleri izleyin. Yeni B2B alımları doğrudan sipariş olarak ilerler.
          </p>
        </div>
        <Link
          href="/bayi/urunler"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900"
        >
          <PackageSearch size={17} aria-hidden="true" />
          Sipariş ürünlerini incele
        </Link>
      </section>

      <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {quotes.length ? (
          <>
            <div className="divide-y divide-slate-200 md:hidden">
              {quotes.map((quote) => (
                <article key={quote.id} className="grid gap-3 px-4 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/bayi/teklifler/${quote.id}`} className="truncate text-sm font-semibold text-slate-950 hover:text-teal-800">{quote.quoteNumber}</Link>
                      <p className="mt-1 text-xs text-slate-500">{formatPortalDate(quote.createdAt)} · {quote._count.items} kalem</p>
                    </div>
                    <PortalStatus status={quote.status} />
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">İstenen teslim</p>
                    <p className="mt-1 text-sm text-slate-700">{formatPortalDate(quote.desiredDeliveryDate)}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Teklif numarası</th>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3">Kalem</th>
                  <th className="px-5 py-3">Talep tarihi</th>
                  <th className="px-5 py-3">İstenen teslim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="text-sm text-slate-700">
                    <td className="px-5 py-4 font-semibold text-slate-950"><Link href={`/bayi/teklifler/${quote.id}`} className="hover:text-teal-800">{quote.quoteNumber}</Link></td>
                    <td className="px-5 py-4"><PortalStatus status={quote.status} /></td>
                    <td className="px-5 py-4">{quote._count.items}</td>
                    <td className="px-5 py-4 text-slate-500">{formatPortalDate(quote.createdAt)}</td>
                    <td className="px-5 py-4 text-slate-500">{formatPortalDate(quote.desiredDeliveryDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto text-slate-300" size={34} aria-hidden="true" />
            <h3 className="mt-4 text-base font-semibold text-slate-950">Arşivlenmiş teklif bulunmuyor</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Yeni B2B alımları ürün kataloğundan doğrudan siparişe dönüşür. Geçmiş teklif kayıtları oluştuğunda yalnızca firmanıza ait veriler burada görünür.
            </p>
            <Link href="/bayi/urunler" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-800">
              <PackageSearch size={17} aria-hidden="true" /> Ürünleri incele
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
