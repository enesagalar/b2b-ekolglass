import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CarFront,
  PackageCheck,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { getCommerceIdentity } from "@/data/commerce";
import { getDealerDashboardData } from "@/data/dealer-portal";
import { CommerceFooter, CommerceHeader } from "@/features/commerce/commerce-header";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function productImage(mediaAssets: { url: string; altText: string; usage: string }[]) {
  return mediaAssets.find((media) => {
    const path = media.url.split(/[?#]/, 1)[0].toLowerCase();
    return media.url.startsWith("/") && /\.(avif|gif|jpe?g|png|webp)$/.test(path);
  });
}

async function getHomepageData() {
  const identity = await getCommerceIdentity();
  const [settings, categories, products, heroMedia] = await Promise.all([
    prisma.siteSetting.findMany({ where: { group: "homepage" } }),
    prisma.productCategory.findMany({
      where: { products: { some: { status: "ACTIVE" } } },
      orderBy: { sortOrder: "asc" },
      take: 5,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        code: true,
        name: true,
        glassType: true,
        vehicleBrand: true,
        vehicleModel: true,
        category: { select: { name: true } },
        stockItems: { select: { status: true } },
        mediaAssets: {
          where: { isActive: true },
          orderBy: { title: "asc" },
          take: 4,
          select: { url: true, altText: true, usage: true },
        },
      },
    }),
    prisma.mediaAsset.findUnique({
      where: { key: "homepage.hero.visual" },
      select: { url: true, altText: true, isActive: true },
    }),
  ]);

  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));
  const dealerSummary = identity?.audience === "dealer" ? await getDealerDashboardData(identity.companyId) : null;

  return {
    identity,
    categories,
    products,
    dealerSummary,
    heroMedia: heroMedia?.isActive ? heroMedia : null,
    heroTitle: settingMap.get("homepage.hero.title") ?? "Aracınız için doğru cam.",
    heroSubtitle:
      settingMap.get("homepage.hero.subtitle") ??
      "Ürün kodu, OEM ve araç bilgileriyle doğru ürünü bulun; bayi fiyatınızı ve stok durumunu görüntüleyin.",
    heroCta: settingMap.get("homepage.hero.cta") ?? "Ürün Ara",
  };
}

export default async function Home() {
  const data = await getHomepageData();
  const heroImage = data.heroMedia?.url ?? "/ekolglass-commerce-hero.png";

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f5f5f7] text-[#1d1d1f]">
      <CommerceHeader identity={data.identity} />

      <section
        className="relative mx-auto mt-2 min-h-[560px] max-w-[1600px] overflow-hidden bg-[#20252b] bg-cover bg-[position:68%_center] text-white sm:mt-3 sm:min-h-[620px] sm:rounded-xl sm:bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
        role="img"
        aria-label={data.heroMedia?.altText ?? "EkolGlass otomotiv cam üretimi"}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,16,20,0.76)_0%,rgba(12,16,20,0.48)_38%,rgba(12,16,20,0.04)_72%)]" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-[560px] max-w-[1440px] items-center px-5 py-16 sm:min-h-[620px] md:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-white/72">EkolGlass B2B Satış Portalı</p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.08] sm:text-5xl md:text-6xl">
              {data.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/78 sm:text-lg">
              {data.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/urunler" className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#00639a] px-5 text-sm font-semibold text-white hover:bg-[#004f7c]">
                {data.heroCta} <ArrowRight size={16} aria-hidden="true" />
              </Link>
              {data.identity?.audience === "dealer" ? (
                <Link href="/bayi" className="inline-flex h-12 items-center gap-2 text-sm font-semibold text-white hover:text-white/75">
                  Bayi çalışma alanına git <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <Link href="/giris" className="inline-flex h-12 items-center gap-2 text-sm font-semibold text-white hover:text-white/75">
                  Bayi hesabına giriş <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-5 max-w-[1440px] px-4 sm:-mt-8 md:px-6" aria-label="Ürün arama">
        <form action="/urunler" className="surface-raised grid gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-end">
          <label className="grid gap-1.5 text-xs font-semibold text-[#4b4c50]">
            Ürün, OEM veya araç
            <span className="flex h-12 items-center rounded-lg border border-[#d9dadd] bg-white focus-within:border-[#00639a]">
              <Search size={18} className="ml-3 shrink-0 text-[#77777c]" aria-hidden="true" />
              <input name="q" placeholder="Örn. 86110-3X000, BMW F30, ön cam" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" />
            </span>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#4b4c50]">
            Ürün grubu
            <select name="categoryId" className="h-12 rounded-lg border border-[#d9dadd] bg-white px-3 text-sm font-normal outline-none focus:border-[#00639a]">
              <option value="">Tüm ürün grupları</option>
              {data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#00639a] px-6 text-sm font-semibold text-white hover:bg-[#004f7c]">
            <Search size={17} aria-hidden="true" /> Ara
          </button>
        </form>
      </section>

      {data.identity?.audience === "dealer" && data.dealerSummary ? (
        <section className="mx-auto mt-8 max-w-[1440px] px-4 md:px-6">
          <div className="grid gap-4 border-y border-[#d9dadd] py-6 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,0.7fr)]">
            <div>
              <p className="text-sm font-semibold text-[#00639a]">{data.identity.companyName}</p>
              <h2 className="mt-1 text-xl font-semibold">Bayi hesabınız güncel</h2>
              <Link href="/bayi" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#00639a]">Operasyon merkezine git <ArrowRight size={15} /></Link>
            </div>
            <div className="border-l border-[#d9dadd] pl-4"><p className="text-3xl font-semibold">{data.dealerSummary.openOrders}</p><p className="mt-1 text-xs text-[#68686d]">Açık sipariş</p></div>
            <div className="border-l border-[#d9dadd] pl-4"><p className="text-3xl font-semibold">{data.dealerSummary.activeShipments}</p><p className="mt-1 text-xs text-[#68686d]">Aktif sevkiyat</p></div>
            <div className="border-l border-[#d9dadd] pl-4"><p className="text-3xl font-semibold">{data.dealerSummary.activeProducts}</p><p className="mt-1 text-xs text-[#68686d]">Aktif ürün</p></div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1440px] px-4 py-14 md:px-6 md:py-20" aria-labelledby="product-groups">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#00639a]">Doğru ürüne hızlı erişim</p>
            <h2 id="product-groups" className="mt-2 text-3xl font-semibold sm:text-4xl">Otomotiv cam çözümleri</h2>
          </div>
          <Link href="/urunler" className="hidden items-center gap-1 text-sm font-semibold text-[#00639a] sm:inline-flex">Tüm ürünler <ArrowRight size={16} /></Link>
        </div>
        <div className="mt-8 grid border-y border-[#d9dadd] sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-[#d9dadd]">
          {data.categories.map((category, index) => (
            <Link key={category.id} href={`/urunler?categoryId=${category.id}`} className="group flex min-h-32 items-center gap-4 border-b border-[#d9dadd] px-4 py-5 hover:bg-white lg:border-b-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#eef0f2] text-[#00639a] transition group-hover:bg-[#eaf4fa]">
                {index % 2 === 0 ? <CarFront size={22} /> : <PackageCheck size={22} />}
              </span>
              <span className="min-w-0"><strong className="block text-sm">{category.name}</strong><span className="mt-1 block text-xs text-[#68686d]">Ürünleri görüntüle</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d9dadd] bg-white py-14 md:py-20" aria-labelledby="featured-products">
        <div className="mx-auto max-w-[1440px] px-4 md:px-6">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-[#00639a]">Güncel katalog</p><h2 id="featured-products" className="mt-2 text-3xl font-semibold sm:text-4xl">Öne çıkan ürünler</h2></div>
            <Link href="/urunler" className="inline-flex items-center gap-1 text-sm font-semibold text-[#00639a]">Tümünü gör <ArrowRight size={16} /></Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.products.map((product) => {
              const image = productImage(product.mediaAssets);
              const inStock = product.stockItems.some((item) => item.status === "IN_STOCK");
              return (
                <Link key={product.id} href={`/urunler/${product.id}`} className="interactive-lift group overflow-hidden rounded-lg border border-[#d9dadd] bg-white">
                  <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f5f5f7]">
                    {image ? <Image src={image.url} alt={image.altText} width={560} height={420} className="h-full w-full object-contain p-5 transition duration-300 group-hover:scale-[1.02]" /> : <CarFront size={56} strokeWidth={1.15} className="text-[#a5a7ab]" aria-hidden="true" />}
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-xs font-semibold text-[#00639a]">{product.code}</p>
                    <h3 className="mt-2 min-h-12 text-sm font-semibold leading-6">{product.name}</h3>
                    <p className="mt-2 text-xs text-[#68686d]">{product.category.name} · {product.glassType}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-[#ececef] pt-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${inStock ? "text-emerald-700" : "text-amber-700"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{inStock ? "Stokta" : "Stok sorunuz"}</span>
                      <ArrowRight size={16} className="text-[#00639a] transition group-hover:translate-x-0.5" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-8 px-4 py-14 md:grid-cols-3 md:px-6 md:py-16">
        {[
          { icon: Search, title: "Doğru ürünü bulun", body: "Ürün kodu, OEM, araç ve teknik özelliklerle arayın." },
          { icon: ShoppingBag, title: "Bayi fiyatınızla sipariş verin", body: "Firma iskontonuz ve ticari koşullarınız otomatik uygulanır." },
          { icon: Truck, title: "Operasyonu takip edin", body: "Sipariş, hazırlık ve sevkiyat durumunu tek yerden izleyin." },
        ].map((item) => <div key={item.title} className="border-l border-[#c4c6ca] pl-5"><item.icon size={21} className="text-[#00639a]" /><h3 className="mt-4 text-base font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#68686d]">{item.body}</p></div>)}
      </section>

      <CommerceFooter identity={data.identity} />
    </main>
  );
}
