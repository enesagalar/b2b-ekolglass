import Link from "next/link";
import { ArrowRight, CarFront, Filter, PackageSearch, Search } from "lucide-react";

import { canViewCatalogPrices, productGlassTypes, resolveCatalogStockSummary, selectCatalogPrice, type CatalogViewer } from "@/domain/catalog";
import { getStatusLabel, stockStatuses } from "@/domain/statuses";
import { getProductBrowserData, type ProductSearchParams } from "@/data/product-browser";

function pageHref(basePath: string, params: ProductSearchParams, page: number) {
  const next = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value && key !== "page") next.set(key, value);
  }
  next.set("page", String(page));
  return `${basePath}?${next.toString()}`;
}

function activeCardImage(mediaAssets: { url: string; altText: string; usage: string }[]) {
  return mediaAssets.find((media) => {
    const usage = media.usage.toLocaleLowerCase("tr-TR");
    const pathname = media.url.split(/[?#]/, 1)[0].toLowerCase();
    const isImage = /(görsel|gorsel|image|foto|photo|gallery)/.test(usage) || /\.(avif|gif|jpe?g|png|webp)$/.test(pathname);

    if (!isImage) return false;
    if (media.url.startsWith("/")) return true;

    try {
      return ["http:", "https:"].includes(new URL(media.url).protocol);
    } catch {
      return false;
    }
  });
}

export async function ProductBrowser({ searchParams, viewer, basePath, embedded = false }: { searchParams: ProductSearchParams; viewer: CatalogViewer; basePath: string; embedded?: boolean }) {
  const data = await getProductBrowserData(searchParams, viewer);
  const canSeePrices = canViewCatalogPrices(viewer);

  return (
    <section className={embedded ? "grid min-w-0 gap-7" : "mx-auto grid max-w-[1440px] gap-7 px-4 py-8 md:px-6 md:py-12"}>
      <div className="flex flex-col justify-between gap-4 border-b border-[#d9dadd] pb-6 md:flex-row md:items-end">
        <div><p className="text-sm font-semibold text-[#00639a]">{embedded ? "Bayi ürün ve fiyatları" : "EkolGlass B2B kataloğu"}</p><h1 className="mt-2 text-3xl font-semibold text-[#1d1d1f] md:text-4xl">Ürünler</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#68686d]">Ürün kodu, OEM, araç, ölçü ve cam tipine göre doğru ürünü bulun.</p></div>
        <p className="text-sm font-semibold text-[#68686d]">{data.total} ürün</p>
      </div>

      <form action={basePath} className="grid gap-3 border-y border-[#d9dadd] bg-white p-4 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_auto]">
        <label className="grid gap-1.5 text-xs font-semibold text-[#4b4c50]">Ürün ara<span className="flex h-12 items-center gap-2 rounded-lg border border-[#d9dadd] px-3 focus-within:border-[#00639a]"><Search size={17} className="text-[#77777c]"/><input name="q" defaultValue={data.query} placeholder="Kod, OEM, marka, model veya ölçü" className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none"/></span></label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#4b4c50]">Kategori<select name="categoryId" defaultValue={data.categoryId} className="h-12 rounded-lg border border-[#d9dadd] bg-white px-3 text-sm font-normal"><option value="">Tüm kategoriler</option>{data.categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#4b4c50]">Cam tipi<select name="glassType" defaultValue={data.glassType} className="h-12 rounded-lg border border-[#d9dadd] bg-white px-3 text-sm font-normal"><option value="">Tüm tipler</option>{productGlassTypes.map(type=><option key={type}>{type}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#4b4c50]">Stok<select name="stockStatus" defaultValue={data.stockStatus} className="h-12 rounded-lg border border-[#d9dadd] bg-white px-3 text-sm font-normal"><option value="">Tüm stoklar</option>{stockStatuses.map(status=><option key={status} value={status}>{getStatusLabel(status)}</option>)}</select></label>
        <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-lg bg-[#00639a] px-5 text-sm font-semibold text-white hover:bg-[#004f7c]"><Filter size={16}/>Filtrele</button>
      </form>

      {data.products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.products.map((product) => {
            const stock = resolveCatalogStockSummary(product.stockItems, viewer);
            const price = selectCatalogPrice(product.prices, viewer);
            const availableStock = product.stockItems.reduce(
              (sum, item) => sum + Math.max(0, item.quantity - item.reservedQuantity),
              0,
            );
            const canOrder = Boolean(price) && availableStock > 0;
            const vehicle = [product.vehicleBrand, product.vehicleModel].filter(Boolean).join(" ");
            const detailHref = `${basePath}/${product.id}`;
            const media = activeCardImage(product.mediaAssets);
            return (
              <article key={product.id} className="interactive-lift overflow-hidden rounded-lg border border-[#d9dadd] bg-white">
                <Link href={detailHref} className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f5f5f7] text-[#8a8b90]">
                  {media ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={media.url} alt={media.altText} className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]" />
                    </>
                  ) : <CarFront size={48} strokeWidth={1.2}/>}<span className="absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-[#4b4c50] backdrop-blur-lg">{product.category.name}</span>
                </Link>
                <div className="p-4">
                  <p className="font-mono text-xs font-semibold text-[#00639a]">{product.code}</p>
                  <h2 className="mt-2 min-h-12 text-sm font-semibold leading-6 text-[#1d1d1f]"><Link href={detailHref} className="transition hover:text-[#00639a]">{product.name}</Link></h2>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-xs"><div><dt className="text-slate-400">Araç</dt><dd className="mt-1 truncate font-medium text-slate-700">{vehicle || "Proje bazlı"}</dd></div><div><dt className="text-slate-400">Cam tipi</dt><dd className="mt-1 truncate font-medium text-slate-700">{product.glassType}</dd></div><div><dt className="text-slate-400">Ölçü</dt><dd className="mt-1 truncate font-medium text-slate-700">{product.dimensions || "Teknik teyit"}</dd></div><div><dt className="text-slate-400">Stok</dt><dd className="mt-1 truncate font-medium text-emerald-700">{stock.label}</dd></div></dl>
                  <div className="mt-4 flex min-h-12 items-end justify-between gap-3 border-t border-[#ececef] pt-3"><div><p className="text-[11px] text-[#77777c]">{canSeePrices ? "Bayi fiyatınız" : "Fiyat"}</p><p className="mt-1 text-base font-semibold text-[#1d1d1f]">{price ? `${price.priceList.currency} ${Number(price.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : canSeePrices ? "Fiyat tanımlı değil" : "Giriş sonrası görünür"}</p>{price && price.discountRate > 0 ? <p className="mt-1 text-[11px] font-semibold text-emerald-700">%{price.discountRate.toLocaleString("tr-TR")} firma iskontosu uygulandı</p> : null}</div>{viewer.role === "GUEST" ? <Link href={`/giris?next=${encodeURIComponent(detailHref)}`} className="inline-flex h-9 items-center rounded-lg border border-[#00639a] px-3 text-xs font-semibold text-[#00639a]">Bayi girişi</Link> : <span className={`rounded px-2 py-1 text-[11px] font-semibold ${canOrder ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{canOrder ? "Sipariş verilebilir" : !price ? "Fiyat bekleniyor" : "Stok teyidi gerekli"}</span>}</div>
                  <Link href={detailHref} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#00639a] transition hover:text-[#004f7c]">Ürün detayını incele<ArrowRight size={14} aria-hidden="true" /></Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className="rounded-lg border border-dashed border-[#c4c6ca] bg-white px-6 py-16 text-center"><PackageSearch className="mx-auto text-[#a5a7ab]" size={34}/><h2 className="mt-4 text-base font-semibold">Eşleşen ürün bulunamadı</h2><p className="mt-2 text-sm text-[#68686d]">Arama ifadesini veya filtreleri değiştirerek tekrar deneyin.</p><Link href={basePath} className="mt-4 inline-flex text-sm font-semibold text-[#00639a]">Filtreleri temizle</Link></div>}

      {data.totalPages > 1 ? <nav className="flex items-center justify-between border-t border-slate-200 pt-5"><Link aria-disabled={data.page===1} href={pageHref(basePath,searchParams,Math.max(1,data.page-1))} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Önceki</Link><span className="text-sm text-slate-500">{data.page} / {data.totalPages}</span><Link aria-disabled={data.page===data.totalPages} href={pageHref(basePath,searchParams,Math.min(data.totalPages,data.page+1))} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Sonraki</Link></nav> : null}
    </section>
  );
}
