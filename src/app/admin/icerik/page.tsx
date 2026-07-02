import Link from "next/link";
import { ImageIcon, Save } from "lucide-react";

import { updateSiteSetting } from "@/features/site-settings/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [settings, pages] = await Promise.all([
    prisma.siteSetting.findMany({
      where: { group: "homepage", isEditable: true },
      orderBy: { key: "asc" },
    }),
    prisma.page.findMany({
      include: { blocks: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/admin" className="font-semibold text-slate-950">
            EkolGlass Admin
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-600">
            Portala dön
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <div className="flex items-center gap-3">
          <ImageIcon size={22} className="text-teal-800" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-teal-800">İçerik yönetimi</p>
            <h1 className="text-3xl font-semibold text-slate-950">CMS temel ekranı</h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          Bu ekran veritabanındaki `SiteSetting`, `Page` ve `PageBlock` kayıtlarını yönetilebilir hale getiren
          ilk adımdır. Tam CMS paneli için Payload/Strapi/Directus kararı dokümantasyonda ayrıştırıldı.
        </p>

        <div className="mt-8 grid gap-4">
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
              <button className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white">
                <Save size={16} aria-hidden="true" />
                Kaydet
              </button>
            </form>
          ))}
        </div>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">CMS sayfaları</h2>
          <div className="mt-4 grid gap-3">
            {pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between rounded-md border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{page.title}</p>
                  <p className="text-xs text-slate-500">
                    /{page.slug} · {page.status} · {page.blocks.length} blok
                  </p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{page.locale}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
