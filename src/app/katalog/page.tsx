import Link from "next/link";
import { Filter, PackageSearch, Search } from "lucide-react";

import { getStatusLabel } from "@/domain/statuses";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: {
      category: true,
      stockItems: true,
      prices: {
        include: { priceList: true },
        orderBy: { minQuantity: "asc" },
      },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { code: "asc" }],
  });

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="font-semibold text-slate-950">
            EkolGlass B2B
          </Link>
          <Link href="/bayi-basvurusu" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white">
            Bayi başvurusu
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-teal-800">Ürün kataloğu</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Araç, kod, ölçü ve cam tipine göre arama</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Ürünler, kategori, stok ve fiyat listesi ilişkileriyle veritabanından okunur. Fiyat görünürlüğü
              bir sonraki auth fazında bayi yetkisine göre uygulanacak.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium">
              <Filter size={16} aria-hidden="true" />
              Filtreler
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">
              <PackageSearch size={16} aria-hidden="true" />
              Hızlı sipariş
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="catalogSearch" className="sr-only">
            Katalogda ara
          </label>
          <div className="flex items-center gap-3 rounded-md border border-slate-300 px-4">
            <Search size={18} className="text-slate-400" aria-hidden="true" />
            <input
              id="catalogSearch"
              placeholder="Ürün kodu, marka, model, ölçü veya OEM referansı"
              className="h-12 w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Ürün kodu</th>
                <th className="px-4 py-3">Ürün</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Araç / kullanım</th>
                <th className="px-4 py-3">Cam tipi</th>
                <th className="px-4 py-3">Stok</th>
                <th className="px-4 py-3">Fiyat temeli</th>
                <th className="px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const stock = product.stockItems[0];
                const firstPrice = product.prices[0];
                const vehicle = [product.vehicleBrand, product.vehicleModel].filter(Boolean).join(" ");
                return (
                  <tr key={product.code} className="border-t border-slate-200">
                    <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-900">{product.code}</td>
                    <td className="px-4 py-4 font-medium text-slate-950">{product.name}</td>
                    <td className="px-4 py-4 text-slate-600">{product.category.name}</td>
                    <td className="px-4 py-4 text-slate-600">{vehicle || "Proje bazlı"}</td>
                    <td className="px-4 py-4 text-slate-600">{product.glassType}</td>
                    <td className="px-4 py-4">
                      <span className="rounded bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">
                        {stock ? getStatusLabel(stock.status) : "Stok sorunuz"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {firstPrice ? `${firstPrice.priceList.currency} ${firstPrice.amount.toString()}` : "Yetkiye bağlı"}
                    </td>
                    <td className="px-4 py-4">
                      <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800">
                        {product.orderMode === "QUOTE_ONLY" ? "Teklif iste" : "Sipariş / teklif"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
