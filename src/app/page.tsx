import Link from "next/link";
import { ArrowRight, Bus, CarFront, Factory, PackageCheck, Search, ShipWheel, Truck, Warehouse } from "lucide-react";

import { getCommerceIdentity } from "@/data/commerce";
import { getDealerDashboardData } from "@/data/dealer-portal";
import { CommerceFooter, CommerceHeader } from "@/features/commerce/commerce-header";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const categoryIcons = [CarFront, Bus, Truck, ShipWheel, Factory];

async function getHomepageData() {
  const identity = await getCommerceIdentity();

  const [settings, categories, products, heroMedia] = await Promise.all([
    prisma.siteSetting.findMany({ where: { group: "homepage" } }),
    prisma.productCategory.findMany({ where: { products: { some: { status: "ACTIVE" } } }, orderBy: { sortOrder: "asc" }, take: 5 }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, code: true, name: true, glassType: true, vehicleBrand: true, vehicleModel: true, dimensions: true, orderMode: true, category: { select: { name: true } }, stockItems: { select: { status: true } } },
    }),
    prisma.mediaAsset.findUnique({ where: { key: "homepage.hero.visual" }, select: { url: true, altText: true, isActive: true } }),
  ]);

  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));
  const dealerSummary = identity ? await getDealerDashboardData(identity.companyId) : null;

  return {
    identity,
    categories,
    products,
    heroMedia: heroMedia?.isActive ? heroMedia : null,
    dealerSummary,
    heroTitle: settingMap.get("homepage.hero.title") ?? "EkolGlass Otomotiv Cam Çözümleri",
    heroSubtitle: settingMap.get("homepage.hero.subtitle") ?? "Araç ve ürün koduna göre camı bulun, stok durumunu ve bayi fiyatınızı görüntüleyin.",
  };
}

export default async function Home() {
  const data = await getHomepageData();
  const productHref = data.identity ? "/bayi/urunler" : "/urunler";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <CommerceHeader identity={data.identity} />

      <section className="relative min-h-[500px] overflow-hidden bg-slate-950 bg-cover bg-center text-white md:min-h-[560px]" style={{ backgroundImage: `url(${data.heroMedia?.url ?? "/ekolglass-commerce-hero.png"})` }} role="img" aria-label={data.heroMedia?.altText ?? "EkolGlass otomotiv cam üretim hattı"}>
        <div className="absolute inset-0 bg-slate-950/55" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-[500px] max-w-[1440px] items-center px-5 py-14 md:min-h-[560px] md:px-6">
          <div className="max-w-3xl">
            {data.identity ? <p className="mb-4 text-sm font-semibold text-teal-200">Tekrar hoş geldiniz, {data.identity.name}</p> : <p className="mb-4 text-sm font-semibold text-teal-200">Camın Ekolü · Profesyonel B2B ürün erişimi</p>}
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">{data.heroTitle}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">{data.heroSubtitle}</p>
            <form action={productHref} className="mt-8 flex max-w-2xl rounded-md bg-white p-1.5 shadow-2xl">
              <Search size={20} className="ml-3 mt-2.5 shrink-0 text-slate-400" aria-hidden="true" />
              <input name="q" placeholder="Ürün kodu, OEM, marka veya model" className="h-11 min-w-0 flex-1 px-3 text-sm text-slate-950 outline-none" />
              <button type="submit" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white">Ürün Ara <ArrowRight size={16} aria-hidden="true" /></button>
            </form>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={productHref} className="inline-flex h-11 items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur">Tüm Ürünler</Link>
              {data.identity ? <Link href="/bayi" className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950">Bayi İşlemlerim</Link> : <Link href="/bayi-basvurusu" className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950">Bayi Olun</Link>}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-y divide-slate-200 border-x border-slate-200 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          {data.categories.map((category, index) => {
            const Icon = categoryIcons[index] ?? Warehouse;
            return <Link key={category.id} href={`${productHref}?categoryId=${category.id}`} className="group flex min-h-28 items-center gap-3 px-4 py-5 transition hover:bg-slate-50"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-teal-800 group-hover:bg-teal-50"><Icon size={21} aria-hidden="true" /></span><span><strong className="block text-sm text-slate-950">{category.name}</strong><span className="mt-1 block text-xs text-slate-500">Ürünleri gör</span></span></Link>;
          })}
        </div>
      </section>

      {data.identity && data.dealerSummary ? (
        <section className="border-b border-slate-200 bg-teal-950 text-white">
          <div className="mx-auto grid max-w-[1440px] gap-4 px-5 py-6 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,0.7fr)] md:px-6">
            <div><p className="text-sm font-semibold text-teal-200">{data.identity.companyName}</p><h2 className="mt-1 text-xl font-semibold">Bayi hesabınız güncel</h2><Link href="/bayi" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white">Operasyon merkezine git <ArrowRight size={15} /></Link></div>
            <div className="border-l border-white/15 pl-4"><p className="text-2xl font-semibold">{data.dealerSummary.openOrders}</p><p className="mt-1 text-xs text-teal-100">Açık sipariş</p></div>
            <div className="border-l border-white/15 pl-4"><p className="text-2xl font-semibold">{data.dealerSummary.openQuotes}</p><p className="mt-1 text-xs text-teal-100">Açık teklif</p></div>
            <div className="border-l border-white/15 pl-4"><p className="text-2xl font-semibold">{data.dealerSummary.activeShipments}</p><p className="mt-1 text-xs text-teal-100">Aktif sevkiyat</p></div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1440px] px-5 py-12 md:px-6" aria-labelledby="featured-products">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-teal-800">Ürün keşfi</p><h2 id="featured-products" className="mt-1 text-2xl font-semibold md:text-3xl">Öne çıkan cam çözümleri</h2></div>
          <Link href={productHref} className="hidden items-center gap-1 text-sm font-semibold text-teal-800 sm:inline-flex">Tüm ürünler <ArrowRight size={16} /></Link>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.products.map((product, index) => (
            <article key={product.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className={`flex aspect-[16/9] items-center justify-center ${index % 3 === 0 ? "bg-slate-900 text-teal-200" : index % 3 === 1 ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-700"}`}><CarFront size={42} strokeWidth={1.4} aria-hidden="true" /></div>
              <div className="p-4"><p className="font-mono text-xs font-semibold text-teal-800">{product.code}</p><h3 className="mt-2 min-h-12 text-sm font-semibold leading-6">{product.name}</h3><p className="mt-2 text-xs text-slate-500">{product.category.name} · {product.glassType}</p><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs font-semibold text-emerald-700">{product.stockItems.some((item) => item.status === "IN_STOCK") ? "Stokta" : "Stok sorunuz"}</span><Link href={`${productHref}?q=${encodeURIComponent(product.code)}`} className="text-xs font-semibold text-teal-800">İncele</Link></div></div>
            </article>
          ))}
        </div>
      </section>

      <section id="cozumler" className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 md:grid-cols-[0.8fr_1.2fr] md:px-6">
          <div><p className="text-sm font-semibold text-teal-800">EkolGlass çözümleri</p><h2 className="mt-2 text-3xl font-semibold">Üründen sevkiyata tek ticaret akışı</h2><p className="mt-4 text-sm leading-7 text-slate-600">Doğru camı bulun, bayi fiyatınızı görüntüleyin ve teklif ile sipariş süreçlerinizi firma hesabınızdan takip edin.</p></div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[{icon:Search,title:"Güçlü ürün arama",body:"Kod, OEM, araç ve ölçüyle arayın."},{icon:PackageCheck,title:"Firma fiyatları",body:"Yetkinize göre doğru fiyatı görün."},{icon:Truck,title:"Operasyon takibi",body:"Teklif, sipariş ve sevkiyatı izleyin."}].map((item)=><div key={item.title} className="border-l-2 border-teal-700 pl-4"><item.icon size={21} className="text-teal-800"/><h3 className="mt-4 text-sm font-semibold">{item.title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{item.body}</p></div>)}
          </div>
        </div>
      </section>

      <section id="uretim" className="mx-auto max-w-[1440px] px-5 py-12 md:px-6"><div className="flex items-center gap-4 border-t border-slate-300 pt-8"><Factory size={28} className="text-teal-800"/><div><h2 className="text-xl font-semibold">Modern üretim, doğrulanabilir ürün verisi</h2><p className="mt-1 text-sm text-slate-600">Teknik özellikler, uyumluluk ve stok kayıtları aynı merkezi sistemden yönetilir.</p></div></div></section>
      <CommerceFooter identity={data.identity} />
    </main>
  );
}
