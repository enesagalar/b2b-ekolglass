import Link from "next/link";
import { ArrowRight, Factory, Search, ShieldCheck } from "lucide-react";

import { portalModules } from "@/data/portal-demo";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getHomepageData() {
  const [settings, productsCount, companiesCount, openQuotesCount, pageBlock] = await Promise.all([
    prisma.siteSetting.findMany({
      where: { group: "homepage" },
    }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.company.count({ where: { status: "APPROVED" } }),
    prisma.quoteRequest.count({ where: { status: { in: ["NEW", "IN_REVIEW", "PRICED"] } } }),
    prisma.pageBlock.findFirst({
      where: {
        page: { slug: "home", status: "PUBLISHED" },
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));

  return {
    heroTitle: settingMap.get("homepage.hero.title") ?? "EkolGlass B2B Bayi Portalı",
    heroSubtitle:
      settingMap.get("homepage.hero.subtitle") ??
      "Onaylı bayiler için katalog, teklif, sipariş ve sevkiyat operasyon portalı.",
    heroCta: settingMap.get("homepage.hero.cta") ?? "Bayi başvurusu yap",
    productsCount,
    companiesCount,
    openQuotesCount,
    pageBlock,
  };
}

export default async function Home() {
  const data = await getHomepageData();

  return (
    <main className="min-h-screen bg-stone-50">
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-45 glass-grid" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-50 to-transparent" aria-hidden="true" />
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-500/20 text-teal-200 ring-1 ring-teal-300/30">
              <Factory size={22} aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold">EkolGlass B2B</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
            <Link href="/katalog" className="transition hover:text-white">
              Katalog
            </Link>
            <Link href="/bayi-basvurusu" className="transition hover:text-white">
              Bayi başvurusu
            </Link>
            <Link href="/admin" className="transition hover:text-white">
              Admin
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-12 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-24 md:pt-20">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-md border border-teal-300/30 bg-teal-400/10 px-3 py-1 text-sm font-medium text-teal-100">
              Otomotiv cam üreticileri için kurumsal bayi operasyonu
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">{data.heroTitle}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">{data.heroSubtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/bayi-basvurusu"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-teal-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
              >
                {data.heroCta}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                href="/katalog"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Kataloğu incele
                <Search size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[360px] rounded-lg border border-white/15 bg-white/8 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="grid gap-4">
              <div className="rounded-md border border-white/10 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-sm font-medium text-slate-300">B2B operasyon özeti</span>
                  <span className="rounded bg-teal-400/15 px-2 py-1 text-xs text-teal-100">Veritabanı bağlı</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    ["Ürün", data.productsCount],
                    ["Onaylı bayi", data.companiesCount],
                    ["Açık teklif", data.openQuotesCount],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-white px-3 py-3 text-slate-900">
                      <div className="text-xl font-semibold">{value}</div>
                      <div className="text-xs text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {[
                "Müşteriye özel fiyat gizliliği",
                "Tekliften siparişe dönüşüm",
                "ERP/MES ve kargo adapter katmanına hazır servis sınırı",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/8 p-4">
                  <ShieldCheck className="text-teal-200" size={20} aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {data.pageBlock ? (
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
            <p className="text-sm font-medium text-teal-800">{data.pageBlock.eyebrow}</p>
            <h2 className="mt-2 max-w-3xl text-2xl font-semibold text-slate-950">{data.pageBlock.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{data.pageBlock.body}</p>
          </div>
        </section>
      ) : null}

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-12 md:grid-cols-3 md:px-8">
        {portalModules.map((module) => {
          const Icon = module.icon;
          return (
            <article key={module.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <Icon size={22} className="text-teal-800" aria-hidden="true" />
              <h2 className="mt-5 text-lg font-semibold text-slate-950">{module.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{module.description}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
