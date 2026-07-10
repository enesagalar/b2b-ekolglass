import Link from "next/link";
import { ArrowLeft, Layers3, Save } from "lucide-react";

import { saveCategory } from "@/features/catalog-management/actions";
import { CatalogActionForm } from "@/features/catalog-management/catalog-action-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700";
const textareaClass =
  "min-h-20 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-700";
const labelClass = "grid gap-1.5 text-xs font-semibold text-slate-700";
const panelClass = "rounded-lg border border-slate-200 bg-white p-5 shadow-sm";

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      <Save size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

export default async function AdminProductCategoriesPage() {
  const categories = await prisma.productCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/urunler" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
          <ArrowLeft size={16} aria-hidden="true" />
          Urun operasyonuna don
        </Link>
        <p className="mt-5 text-sm font-medium text-teal-800">Katalog taksonomisi</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Kategori yonetimi</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Public katalog filtreleri ve admin urun formlari bu kategori kayitlarini kullanir.
        </p>
      </div>

      <section className={panelClass}>
        <div className="flex items-center gap-3">
          <Layers3 size={20} className="text-teal-800" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-950">Yeni kategori</h2>
        </div>
        <CatalogActionForm action={saveCategory} className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_0.35fr_auto]">
          <label className={labelClass}>
            Kategori adi
            <input name="name" required className={inputClass} placeholder="Otomotiv Cami" />
          </label>
          <label className={labelClass}>
            Slug
            <input name="slug" className={inputClass} placeholder="Bossa addan uretilir" />
          </label>
          <label className={labelClass}>
            Sira
            <input name="sortOrder" type="number" min={0} defaultValue={0} className={inputClass} />
          </label>
          <div className="flex items-end">
            <SubmitButton label="Kategori ekle" />
          </div>
          <label className={`${labelClass} lg:col-span-4`}>
            Aciklama
            <textarea name="description" className={textareaClass} />
          </label>
        </CatalogActionForm>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Kategori kayitlari</h2>
          <p className="mt-1 text-sm text-slate-500">{categories.length} kategori listeleniyor.</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <CatalogActionForm key={category.id} action={saveCategory} className="grid gap-3 rounded-lg border border-slate-200 p-4">
              <input type="hidden" name="id" value={category.id} />
              <label className={labelClass}>
                Kategori adi
                <input name="name" required defaultValue={category.name} className={inputClass} />
              </label>
              <label className={labelClass}>
                Slug
                <input name="slug" defaultValue={category.slug} className={inputClass} />
              </label>
              <label className={labelClass}>
                Sira
                <input name="sortOrder" type="number" min={0} defaultValue={category.sortOrder} className={inputClass} />
              </label>
              <label className={labelClass}>
                Aciklama
                <textarea name="description" defaultValue={category.description ?? ""} className={textareaClass} />
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">{category._count.products} urun</span>
                <SubmitButton label="Guncelle" />
              </div>
            </CatalogActionForm>
          ))}
        </div>
      </section>
    </div>
  );
}
