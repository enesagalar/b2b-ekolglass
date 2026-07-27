import { ArrowRight, CheckCircle2, ChevronDown, Eye, ImageIcon } from "lucide-react";

import { HeroMediaUpload } from "@/features/site-settings/hero-media-upload";
import { SiteSettingForm } from "@/features/site-settings/site-setting-form";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requirePermissionUser("admin.content.manage", "/admin/icerik");
  const [settings, pages, heroMedia] = await Promise.all([
    prisma.siteSetting.findMany({
      where: { group: "homepage", isEditable: true },
      orderBy: { key: "asc" },
    }),
    prisma.page.findMany({
      include: { blocks: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.mediaAsset.findUnique({ where: { key: "homepage.hero.visual" } }),
  ]);
  const settingOrder = [
    "homepage.hero.title",
    "homepage.hero.subtitle",
    "homepage.hero.cta",
  ];
  const orderedSettings = [...settings].sort(
    (left, right) => settingOrder.indexOf(left.key) - settingOrder.indexOf(right.key),
  );
  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));
  const heroTitle = settingMap.get("homepage.hero.title") ?? "Aracınız için doğru cam.";
  const heroSubtitle =
    settingMap.get("homepage.hero.subtitle") ??
    "Ürün kodu, araç veya cam tipine göre arayın; bayi fiyatınızı ve stok durumunu görüntüleyin.";
  const heroCta = settingMap.get("homepage.hero.cta") ?? "Ürün Ara";
  const lastUpdated = [heroMedia?.updatedAt, ...settings.map((setting) => setting.updatedAt)]
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0];
  const settingDescriptions: Record<string, string> = {
    "homepage.hero.title": "Ana sayfada müşterinin ilk gördüğü büyük başlık.",
    "homepage.hero.subtitle": "Başlığın altında ürün arama ve bayi alışveriş akışını açıklayan kısa metin.",
    "homepage.hero.cta": "Banner içindeki ürün arama düğmesinin üzerinde görünen metin.",
  };
  const pageStatusLabels: Record<string, string> = {
    DRAFT: "Taslak",
    PUBLISHED: "Yayında",
    ARCHIVED: "Arşivde",
  };

  return (
    <div className="grid gap-6">
      <section className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#eaf4fa] text-[#00639a] ring-1 ring-[#d9edf7]">
            <ImageIcon size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#00639a]">Satış portalı içeriği</p>
            <h2 className="text-2xl font-semibold text-slate-950">Ana sayfa ve bannerlar</h2>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Bayilerin ana sayfada gördüğü banner metnini ve görselini yönetin. Kaydedilen her alan doğrudan satış portalına yansır.
        </p>
      </section>

      <section className="grid gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex items-start gap-3 text-emerald-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/70">
            <CheckCircle2 size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase">Banner yayında</p>
            <h3 className="mt-1 text-base font-semibold">Mevcut ana sayfa içeriği kullanıcılara gösteriliyor</h3>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Önce metni, ardından gerekiyorsa görseli değiştirin. Her alan bağımsız kaydedilir.
              {lastUpdated ? ` Son güncelleme: ${lastUpdated.toLocaleString("tr-TR")}.` : ""}
            </p>
          </div>
        </div>
        <a
          href="#banner-metni"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Bannerı düzenle
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
        <div
          className="relative flex min-h-[340px] items-end bg-cover bg-center p-6 sm:min-h-[420px] sm:p-10"
          style={{ backgroundImage: `url(${heroMedia?.url ?? "/ekolglass-commerce-hero.png"})` }}
          role="img"
          aria-label={heroMedia?.altText ?? "Ana sayfa banner önizlemesi"}
        >
          <div className="absolute inset-0 bg-slate-950/70" aria-hidden="true" />
          <div className="relative max-w-2xl text-white">
            <p className="text-xs font-semibold uppercase text-cyan-200">Canlı banner önizlemesi</p>
            <h3 className="mt-3 text-3xl font-semibold sm:text-4xl">{heroTitle}</h3>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">{heroSubtitle}</p>
            <span className="mt-5 inline-flex min-h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-slate-950">
              {heroCta}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-slate-300">
          <Eye size={15} aria-hidden="true" />
          Önizleme mevcut kaydedilmiş içeriği gösterir.
        </div>
      </section>

      <section id="banner-metni" className="scroll-mt-28 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase text-[#00639a]">1. adım</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">Banner metinlerini düzenle</h3>
          <p className="mt-1 text-sm text-slate-600">Yalnız değiştirdiğiniz alanı kaydedin; diğer banner alanları etkilenmez.</p>
        </div>
        <div>
          {orderedSettings.map((setting) => (
            <SiteSettingForm
              key={setting.key}
              setting={{
                key: setting.key,
                label: setting.label,
                value: setting.value,
                updatedAt: setting.updatedAt.toISOString(),
              }}
              description={settingDescriptions[setting.key] ?? setting.description ?? "Ana sayfada gösterilen içerik alanı."}
            />
          ))}
        </div>
      </section>

      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white xl:grid-cols-[1.05fr_0.95fr]">
        <div
          className="min-h-64 bg-slate-900 bg-cover bg-center xl:min-h-[420px]"
          style={{ backgroundImage: `url(${heroMedia?.url ?? "/ekolglass-commerce-hero.png"})` }}
          role="img"
          aria-label={heroMedia?.altText ?? "Mevcut ana sayfa banner görseli"}
        />
        <HeroMediaUpload
          defaultAltText={heroMedia?.altText ?? "EkolGlass otomotiv cam üretim hattı"}
          expectedUpdatedAt={heroMedia?.updatedAt.toISOString() ?? ""}
        />
      </section>

      <details className="group border-y border-slate-200">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-slate-800">
          <span>
            Gelişmiş CMS sayfa kayıtları
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Teknik sayfa, dil ve blok bilgileri; bu ekrandan düzenlenmez
            </span>
          </span>
          <ChevronDown size={18} className="transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="divide-y divide-slate-200 border-t border-slate-200">
          {pages.length > 0 ? pages.map((page) => (
            <div key={page.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{page.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  /{page.slug} · {page.blocks.length} içerik bloğu
                </p>
              </div>
              <div className="grid justify-items-end gap-1">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {pageStatusLabels[page.status] ?? "Durum bilinmiyor"}
                </span>
                <span className="text-[11px] uppercase text-slate-500">{page.locale}</span>
              </div>
            </div>
          )) : (
            <p className="px-5 py-8 text-sm text-slate-500">Tanımlı CMS sayfası bulunmuyor.</p>
          )}
        </div>
      </details>
    </div>
  );
}
