import { randomUUID } from "node:crypto";

import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  History,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { getStockTransferWorkspace } from "@/data/admin-stock-transfers";
import { StockTransferForm } from "@/features/stock-transfer/stock-transfer-form";
import { requirePermissionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminStockTransfersPage({
  searchParams,
}: PageProps<"/admin/stok/transferler">) {
  await requirePermissionUser("stock.transfer", "/admin/stok/transferler");
  const query = first((await searchParams).q)?.trim() ?? "";
  const workspace = await getStockTransferWorkspace(query);

  return (
    <div className="grid min-w-0 gap-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div>
          <Link
            href="/admin/stok"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Stok merkezine dön
          </Link>
          <p className="mt-5 text-sm font-semibold text-teal-800">
            Depo operasyonu
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Depolar arası transfer
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Kullanılabilir stoğu kaynak depodan hedef depoya tek işlemde
            taşıyın. Başarısız bir adımda iki depo da eski bakiyesinde kalır.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <ShieldCheck size={18} className="text-teal-800" aria-hidden="true" />
          Atomik ve denetlenebilir işlem
        </div>
      </section>

      <section className="grid gap-4 border-b border-slate-200 pb-6 lg:grid-cols-3">
        {[
          {
            icon: Boxes,
            title: "Yalnız kullanılabilir stok",
            text: "Siparişlere rezerve edilen miktar kaynak depoda korunur.",
          },
          {
            icon: ArrowRight,
            title: "İki bakiye, tek işlem",
            text: "Kaynak azalışı ve hedef artışı birlikte tamamlanır veya birlikte geri alınır.",
          },
          {
            icon: History,
            title: "Çift taraflı hareket kaydı",
            text: "Çıkış ve giriş aynı transfer numarasıyla hareket defterine yazılır.",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="border-l-2 border-teal-700 pl-4">
              <Icon size={18} className="text-teal-800" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-slate-950">
                {item.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {item.text}
              </p>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-semibold text-slate-950">Yeni transfer</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Listede ürün yoksa ürün kodu veya adıyla kaynak stok arayın.
          </p>
          <form className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Kaynak stok ara</span>
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-3 text-slate-400"
                aria-hidden="true"
              />
              <input
                name="q"
                defaultValue={query}
                placeholder="Ürün kodu veya adı"
                className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-700"
              />
            </label>
            <button className="h-11 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-800">
              Kaynak stokları getir
            </button>
          </form>
        </div>
        <div className="p-5">
          <StockTransferForm
            sourceOptions={workspace.sourceOptions}
            warehouses={workspace.warehouses}
            initialIdempotencyKey={randomUUID()}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-semibold text-slate-950">
            Son tamamlanan transferler
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            En son 20 işlem, ürünü ve operasyon gerekçesiyle gösterilir.
          </p>
        </div>
        {workspace.recentTransfers.length ? (
          <div className="divide-y divide-slate-200">
            {workspace.recentTransfers.map((transfer) => (
              <article
                key={transfer.id}
                className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/urunler/${transfer.productId}?tab=stok`}
                      className="font-semibold text-teal-800"
                    >
                      {transfer.productCode}
                    </Link>
                    <span className="text-xs text-slate-400">
                      {transfer.transferNumber}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-700">
                    {transfer.product.name}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {transfer.reason}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  {transfer.sourceWarehouseCode}
                  <ArrowRight size={16} className="text-teal-800" />
                  {transfer.destinationWarehouseCode}
                </div>
                <div className="lg:text-right">
                  <p className="font-semibold tabular-nums text-slate-950">
                    {transfer.quantity.toLocaleString("tr-TR")} adet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Intl.DateTimeFormat("tr-TR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "Europe/Istanbul",
                    }).format(transfer.createdAt)}
                    {" · "}
                    {transfer.actor.name}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-10 text-center text-sm text-slate-500">
            Henüz tamamlanmış depo transferi yok.
          </p>
        )}
      </section>
    </div>
  );
}
