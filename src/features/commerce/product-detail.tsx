import Link from "next/link";
import {
  ArrowLeft,
  CarFront,
  Check,
  ExternalLink,
  FileText,
  Images,
  PackageCheck,
  Ruler,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";

import type { ProductDetailData } from "@/data/product-detail";
import {
  canViewCatalogPrices,
  getOrderModeLabel,
  resolveCatalogStockSummary,
  selectCatalogPrice,
  type CatalogViewer,
} from "@/domain/catalog";
import { AddToQuoteCartForm } from "@/features/quotes/quote-forms";
import { AddToOrderCartForm } from "@/features/orders/order-forms";

function safeMediaUrl(url: string) {
  if (url.startsWith("/")) return url;

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol)
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function isImageMedia(media: ProductDetailData["mediaAssets"][number]) {
  const usage = media.usage.toLocaleLowerCase("tr-TR");
  const pathname = media.url.split(/[?#]/, 1)[0].toLowerCase();
  return (
    /(görsel|gorsel|image|foto|photo|gallery)/.test(usage) ||
    /\.(avif|gif|jpe?g|png|webp)$/.test(pathname)
  );
}

function formatYearRange(start: number | null, end: number | null) {
  if (start && end) return start === end ? String(start) : `${start} - ${end}`;
  if (start) return `${start} ve sonrası`;
  if (end) return `${end} ve öncesi`;
  return "Model yılı belirtilmemiş";
}

function formatPrice(amount: { toString(): string }, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0 sm:border-b-0 sm:py-0">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1.5 text-sm font-semibold text-slate-900">
        {value || "Belirtilmemiş"}
      </dd>
    </div>
  );
}

export function ProductDetail({
  product,
  viewer,
  basePath,
  embedded = false,
  adminView = false,
}: {
  product: ProductDetailData;
  viewer: CatalogViewer;
  basePath: string;
  embedded?: boolean;
  adminView?: boolean;
}) {
  const stock = resolveCatalogStockSummary(product.stockItems, viewer);
  const price = selectCatalogPrice(product.prices, viewer);
  const canSeePrices = canViewCatalogPrices(viewer);
  const safeMedia = product.mediaAssets.flatMap((media) => {
    const url = safeMediaUrl(media.url);
    return url ? [{ ...media, url }] : [];
  });
  const images = safeMedia.filter(isImageMedia);
  const documents = safeMedia.filter((media) => !isImageMedia(media));
  const primaryImage = images[0];
  const vehicle = [product.vehicleBrand, product.vehicleModel]
    .filter(Boolean)
    .join(" ");
  const detailPath = `${basePath}/${product.id}`;

  return (
    <section
      className={
        embedded
          ? "grid min-w-0 gap-6"
          : "mx-auto grid max-w-[1440px] gap-6 px-4 py-8 md:px-6 md:py-10"
      }
    >
      <nav
        aria-label="Sayfa yolu"
        className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
      >
        <Link
          href={basePath}
          className="inline-flex items-center gap-1.5 font-semibold text-teal-800 transition hover:text-teal-950"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Ürünler
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-mono text-xs text-slate-600">{product.code}</span>
      </nav>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] xl:items-start">
        <div className="grid min-w-0 gap-5">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="relative flex aspect-[4/3] max-h-[620px] min-h-[280px] items-center justify-center overflow-hidden bg-slate-100 sm:aspect-[16/10]">
              {primaryImage ? (
                // Product media can be hosted by customer-managed domains, so the native element avoids a brittle host allowlist.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryImage.url}
                  alt={primaryImage.altText}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="grid justify-items-center gap-4 px-6 text-center text-slate-400">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-300 bg-white text-teal-800 shadow-sm">
                    <CarFront size={42} strokeWidth={1.3} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">
                      Ürün görseli hazırlanıyor
                    </p>
                    <p className="mt-1 text-xs">
                      Teknik bilgiler aşağıda yer alıyor.
                    </p>
                  </div>
                </div>
              )}
              <span className="absolute left-4 top-4 rounded-md bg-slate-950/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                {product.category.name}
              </span>
            </div>
          </div>

          {images.length > 1 ? (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
              aria-label="Aktif ürün görselleri"
            >
              {images.slice(1).map((image) => (
                <a
                  key={image.id}
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white transition hover:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.altText}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="grid gap-5 xl:sticky xl:top-24">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-teal-800">
                {product.code}
              </span>
              <span className="rounded bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-900">
                Aktif ürün
              </span>
              {product.isCustomAvailable ? (
                <span className="rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                  Özel üretime uygun
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 text-2xl font-semibold leading-tight text-slate-950 md:text-3xl">
              {product.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {vehicle
                ? `${vehicle} için ${product.glassPosition ?? product.glassType.toLocaleLowerCase("tr-TR")} çözümü.`
                : `${product.glassType} cam çözümü.`}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 border-y border-slate-200 py-5 text-sm">
              <div>
                <p className="text-xs text-slate-500">Stok durumu</p>
                <p className="mt-1 font-semibold text-emerald-700">
                  {stock.label}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {stock.detail}
                </p>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <p className="text-xs text-slate-500">Satış biçimi</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {getOrderModeLabel(product.orderMode)}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-slate-500">
                {canSeePrices ? "Firma fiyatınız" : "Fiyat bilgisi"}
              </p>
              {price ? (
                <>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">
                    {formatPrice(price.amount, price.priceList.currency)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    KDV hariç · Minimum {price.minQuantity} adet
                  </p>
                </>
              ) : (
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {canSeePrices
                    ? "Firma fiyatı tanımlı değil"
                    : "Bayi girişinden sonra görünür"}
                </p>
              )}
            </div>

            <div className="mt-6">
              {adminView ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Yönetici görünümü
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Bayi fiyatları ve ticari işlemler yalnızca bayi hesabıyla
                    kullanılabilir.
                  </p>
                  <Link
                    href="/admin"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-950"
                  >
                    Yönetim paneline dön
                    <ExternalLink size={15} aria-hidden="true" />
                  </Link>
                </div>
              ) : viewer.role === "GUEST" ? (
                <Link
                  href={`/giris?next=${encodeURIComponent(detailPath)}`}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                  Bayi fiyatı için giriş yap
                </Link>
              ) : (
                <div className="grid gap-3">
                  {product.orderMode !== "QUOTE_ONLY" ? (
                    <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
                      <div className="mb-4 flex items-start gap-3">
                        <ShoppingCart
                          className="mt-0.5 shrink-0 text-slate-800"
                          size={19}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            Doğrudan sipariş
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            Firma fiyatı ve kullanılabilir stok gönderim
                            sırasında yeniden doğrulanır.
                          </p>
                        </div>
                      </div>
                      <AddToOrderCartForm productId={product.id} />
                    </div>
                  ) : null}
                  {product.orderMode !== "ORDER_ONLY" ? (
                    <div className="rounded-md border border-dashed border-teal-300 bg-teal-50 p-4">
                      <div className="mb-4 flex items-start gap-3">
                        <ShoppingCart
                          className="mt-0.5 shrink-0 text-teal-800"
                          size={19}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            Teklif sepeti
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            İhtiyacınız olan adedi belirleyerek firma teklif
                            sepetinize ekleyin.
                          </p>
                        </div>
                      </div>
                      <AddToQuoteCartForm productId={product.id} />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white py-4 text-center shadow-sm">
            <div className="px-2">
              <Ruler
                className="mx-auto text-teal-800"
                size={18}
                aria-hidden="true"
              />
              <p className="mt-2 text-[11px] font-semibold text-slate-600">
                Teknik ölçü
              </p>
            </div>
            <div className="px-2">
              <PackageCheck
                className="mx-auto text-teal-800"
                size={18}
                aria-hidden="true"
              />
              <p className="mt-2 text-[11px] font-semibold text-slate-600">
                Stok teyidi
              </p>
            </div>
            <div className="px-2">
              <Check
                className="mx-auto text-teal-800"
                size={18}
                aria-hidden="true"
              />
              <p className="mt-2 text-[11px] font-semibold text-slate-600">
                Uyumluluk
              </p>
            </div>
          </div>
        </aside>
      </div>

      <section className="border-y border-slate-200 bg-white px-5 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <Ruler className="text-teal-800" size={21} aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-teal-800">Ürün tanımı</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Teknik özellikler
            </h2>
          </div>
        </div>
        <dl className="mt-6 grid gap-x-8 sm:grid-cols-2 sm:gap-y-6 lg:grid-cols-4">
          <DetailItem label="Araç" value={vehicle || "Proje bazlı"} />
          <DetailItem
            label="Model yılı"
            value={formatYearRange(product.yearStart, product.yearEnd)}
          />
          <DetailItem label="Cam konumu" value={product.glassPosition} />
          <DetailItem label="Cam tipi" value={product.glassType} />
          <DetailItem label="Ölçüler" value={product.dimensions} />
          <DetailItem
            label="Kalınlık"
            value={
              product.thicknessMm ? `${Number(product.thicknessMm)} mm` : null
            }
          />
          <DetailItem label="Renk / ton" value={product.tint} />
          <DetailItem
            label="Yapı"
            value={
              [
                product.isLaminated && "Lamine",
                product.isTempered && "Temperli",
              ]
                .filter(Boolean)
                .join(" + ") || product.glassType
            }
          />
        </dl>
      </section>

      {product.compatibilities.length ? (
        <section className="grid gap-4">
          <div>
            <p className="text-xs font-semibold text-teal-800">
              Araç eşleşmeleri
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Uyumluluk listesi
            </h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1fr_1fr_0.7fr_0.8fr] gap-4 bg-slate-950 px-5 py-3 text-xs font-semibold text-white md:grid">
              <span>Marka / model</span>
              <span>Model yılı</span>
              <span>OEM referansı</span>
              <span>Not</span>
            </div>
            <div className="divide-y divide-slate-200">
              {product.compatibilities.map((compatibility) => (
                <div
                  key={compatibility.id}
                  className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[1fr_1fr_0.7fr_0.8fr] md:gap-4"
                >
                  <div>
                    <span className="text-xs text-slate-400 md:hidden">
                      Marka / model
                    </span>
                    <p className="mt-1 font-semibold text-slate-900 md:mt-0">
                      {compatibility.vehicleBrand} {compatibility.vehicleModel}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 md:hidden">
                      Model yılı
                    </span>
                    <p className="mt-1 text-slate-600 md:mt-0">
                      {formatYearRange(
                        compatibility.yearStart,
                        compatibility.yearEnd,
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 md:hidden">
                      OEM referansı
                    </span>
                    <p className="mt-1 font-mono text-xs font-semibold text-slate-700 md:mt-0">
                      {compatibility.oemReference || "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 md:hidden">
                      Not
                    </span>
                    <p className="mt-1 text-slate-600 md:mt-0">
                      {compatibility.notes || "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {documents.length ? (
        <section className="grid gap-4">
          <div className="flex items-center gap-3">
            <Images className="text-teal-800" size={21} aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-teal-800">Aktif medya</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Dokümanlar
              </h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <a
                key={document.id}
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800">
                  <FileText size={19} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {document.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {document.usage}
                  </span>
                </span>
                <ExternalLink
                  size={16}
                  className="shrink-0 text-slate-400"
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
