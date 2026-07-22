import { ImageIcon } from "lucide-react";

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

  return (
    <div className="grid gap-6">
      <section className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#eaf4fa] text-[#00639a] ring-1 ring-[#d9edf7]">
            <ImageIcon size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#00639a]">İçerik yönetimi</p>
            <h2 className="text-2xl font-semibold text-slate-950">Ana sayfa ve bannerlar</h2>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Satış portalının ana banner metnini, aksiyonunu ve görselini buradan güncelleyin. Değişiklikler kaydedildikten
          sonra public ana sayfaya yansır.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {settings.map((setting) => (
          <SiteSettingForm
            key={setting.key}
            setting={{
              key: setting.key,
              label: setting.label,
              value: setting.value,
              updatedAt: setting.updatedAt.toISOString(),
            }}
          />
        ))}
      </section>

      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white xl:grid-cols-[1.15fr_0.85fr]">
        <div className="min-h-72 bg-slate-900 bg-cover bg-center xl:min-h-[420px]" style={{ backgroundImage: `url(${heroMedia?.url ?? "/ekolglass-commerce-hero.png"})` }} role="img" aria-label={heroMedia?.altText ?? "Ana sayfa banner önizlemesi"} />
        <HeroMediaUpload
          defaultAltText={heroMedia?.altText ?? "EkolGlass otomotiv cam uretim hatti"}
          expectedUpdatedAt={heroMedia?.updatedAt.toISOString() ?? ""}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-950">CMS sayfaları</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {pages.map((page) => (
            <div key={page.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{page.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  /{page.slug} · {page.status} · {page.blocks.length} blok
                </p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{page.locale}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
