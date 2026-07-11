import { ImageIcon, Save } from "lucide-react";

import { updateHomepageHeroMedia, updateSiteSetting } from "@/features/site-settings/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
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
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-teal-800 ring-1 ring-teal-100">
            <ImageIcon size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-teal-800">İçerik yönetimi</p>
            <h2 className="text-2xl font-semibold text-slate-950">CMS temel ekranı</h2>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Ana sayfa banner metinleri ve CMS kayıtları buradan yönetilir. Tam blok editörü Faz 3.1 sonrasında
          Payload/Directus kararına göre genişletilecek.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {settings.map((setting) => (
          <form key={setting.key} action={updateSiteSetting} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="key" value={setting.key} />
            <label htmlFor={setting.key} className="text-sm font-semibold text-slate-900">
              {setting.label}
            </label>
            <textarea
              id={setting.key}
              name="value"
              rows={setting.key.endsWith("subtitle") ? 4 : 2}
              defaultValue={setting.value}
              className="mt-3 w-full resize-none rounded-md border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-teal-700"
            />
            <button className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900">
              <Save size={16} aria-hidden="true" />
              Kaydet
            </button>
          </form>
        ))}
      </section>

      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm xl:grid-cols-[1.1fr_0.9fr]">
        <div className="min-h-72 bg-slate-900 bg-cover bg-center" style={{ backgroundImage: `url(${heroMedia?.url ?? "/ekolglass-commerce-hero.png"})` }} role="img" aria-label={heroMedia?.altText ?? "Ana sayfa banner önizlemesi"} />
        <form action={updateHomepageHeroMedia} className="grid content-center gap-4 p-5">
          <div><p className="text-sm font-semibold text-teal-800">Ana banner görseli</p><h3 className="mt-1 text-xl font-semibold text-slate-950">Görsel ve alternatif metin</h3></div>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">Görsel yolu veya URL<input name="url" defaultValue={heroMedia?.url ?? "/ekolglass-commerce-hero.png"} required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-teal-700" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">Alternatif metin<input name="altText" defaultValue={heroMedia?.altText ?? "EkolGlass otomotiv cam üretim hattı"} required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-teal-700" /></label>
          <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white"><Save size={16}/>Görseli kaydet</button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
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
