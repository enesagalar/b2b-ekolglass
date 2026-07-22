import { randomUUID } from "node:crypto";
import Link from "next/link";
import {
  ArrowLeft,
  PackageSearch,
  Save,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { requireDealerContext } from "@/data/dealer-context";
import { getOrderCart } from "@/data/order-cart";
import { selectCatalogPriceForQuantity } from "@/domain/catalog";
import {
  CommerceFooter,
  CommerceHeader,
} from "@/features/commerce/commerce-header";
import {
  removeOrderCartItemAction,
  updateOrderCartItemAction,
} from "@/features/orders/actions";
import { NewAddressForm, SubmitOrderForm } from "@/features/orders/order-forms";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(amount: { toString(): string }, currency: string) {
  return `${currency} ${Number(amount.toString()).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function OrderCartPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const [{ user, company }, params] = await Promise.all([
    requireDealerContext("/sepet"),
    searchParams,
  ]);
  const actor = {
    userId: user.id,
    companyId: company.id,
    customerGroupId: company.customerGroup?.id,
    discountRate: company.discountRate?.toString() ?? "0",
    role: user.role as "DEALER_OWNER" | "DEALER_STAFF",
  };
  const [cart, addresses] = await Promise.all([
    getOrderCart(actor),
    prisma.address.findMany({
      where: { companyId: company.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        label: true,
        line1: true,
        district: true,
        city: true,
        isDefault: true,
      },
    }),
  ]);
  const items = cart?.items ?? [];
  const identity = {
    audience: "dealer" as const,
    name: user.name,
    companyId: company.id,
    companyName: company.displayName,
  };
  const pricedItems = items.map((item) => {
    const price = selectCatalogPriceForQuantity(
      item.product.prices,
      actor,
      item.quantity,
    );
    const available = item.product.stockItems.reduce(
      (sum, stock) =>
        sum + Math.max(0, stock.quantity - stock.reservedQuantity),
      0,
    );
    return {
      ...item,
      price,
      available,
      lineTotal: price ? Number(price.amount.toString()) * item.quantity : null,
    };
  });
  const currency =
    pricedItems.find((item) => item.price)?.price?.priceList.currency ?? "TRY";
  const subtotal = pricedItems.reduce(
    (sum, item) => sum + (item.lineTotal ?? 0),
    0,
  );

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f5f5f7] text-[#1d1d1f]">
      <CommerceHeader identity={identity} />
      <div className="mx-auto grid max-w-[1440px] gap-7 px-4 py-8 pb-20 md:px-6 md:py-12 lg:pb-12">
        {params.added === "1" ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Ürün sipariş sepetine eklendi.
          </div>
        ) : null}
        <section className="grid gap-6 border-b border-[#d9dadd] pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-[#00639a]">
              {company.displayName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
              Sipariş sepeti
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#68686d]">
              Fiyat, adres ve kullanılabilir stok gönderim anında sunucuda
              yeniden doğrulanır.
            </p>
          </div>
          <div className="grid gap-4">
            <ol className="flex items-center gap-3 text-xs font-medium text-[#8a8b90]" aria-label="Sipariş adımları">
              <li className="flex items-center gap-2 text-[#00639a]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00639a] text-white">1</span> Sepet</li>
              <li className="h-px w-8 bg-[#d9dadd] sm:w-14" aria-hidden="true" />
              <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e5e5e8]">2</span> Teslimat</li>
              <li className="h-px w-8 bg-[#d9dadd] sm:w-14" aria-hidden="true" />
              <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e5e5e8]">3</span> Onay</li>
            </ol>
            <Link href="/urunler" className="inline-flex h-11 items-center justify-center gap-2 justify-self-start rounded-lg border border-[#d9dadd] bg-white px-4 text-sm font-semibold lg:justify-self-end">
              <ArrowLeft size={17} /> Ürünlere dön
            </Link>
          </div>
        </section>
        {!items.length ? (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <ShoppingCart className="mx-auto text-slate-300" size={38} />
            <h2 className="mt-4 font-semibold">Sipariş sepetiniz boş</h2>
            <p className="mt-2 text-sm text-slate-500">
              Siparişe uygun ürünleri ürün detayından ekleyebilirsiniz.
            </p>
            <Link
              href="/urunler"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#00639a]"
            >
              <PackageSearch size={17} />
              Ürünleri incele
            </Link>
          </section>
        ) : (
          <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)] xl:items-start xl:gap-12">
            <section className="min-w-0 overflow-hidden border-y border-[#d9dadd] bg-white">
              {pricedItems.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-5 border-b border-[#ececef] p-5 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center md:p-6"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-[#00639a]">
                      {item.product.code}
                    </p>
                    <h2 className="mt-1 font-semibold">{item.product.name}</h2>
                    <p className="mt-2 text-xs text-[#68686d]">
                      {item.product.category.name} · {item.product.glassType} ·{" "}
                      {item.product.dimensions ?? "Ölçü teyit edilecek"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <span className="font-semibold">
                        {item.price
                          ? money(
                              item.price.amount,
                              item.price.priceList.currency,
                            )
                          : "Fiyat bulunamadı"}
                      </span>
                      <span
                        className={
                          item.available >= item.quantity
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-red-700"
                        }
                      >
                        {item.available >= item.quantity
                          ? `${item.available} adet kullanılabilir`
                          : `Yalnızca ${item.available} adet kullanılabilir`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 sm:items-start">
                    <form
                      action={updateOrderCartItemAction}
                      className="flex items-end gap-2"
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <label className="grid gap-1 text-xs font-semibold text-slate-600">
                        Adet
                        <input
                          name="quantity"
                          type="number"
                          min="1"
                          max="999"
                          defaultValue={item.quantity}
                          className="h-11 w-20 rounded-lg border border-[#d9dadd] px-2 text-sm"
                        />
                      </label>
                      <button
                        title="Adedi güncelle"
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d9dadd] hover:bg-[#f0f1f3]"
                      >
                        <Save size={16} />
                      </button>
                    </form>
                    <form action={removeOrderCartItemAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button
                        title="Kalemi kaldır"
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </div>
                </article>
              ))}
              <NewAddressForm />
            </section>
            <aside className="surface-raised p-5 sm:p-6 xl:sticky xl:top-28">
              <div className="border-b border-[#d9dadd] pb-5">
                <p className="text-xs font-semibold uppercase text-[#68686d]">
                  Sipariş özeti
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {items.length} kalem ·{" "}
                  {items.reduce((sum, item) => sum + item.quantity, 0)} adet
                </p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-[#68686d]">KDV hariç ara toplam</span>
                  <strong className="text-lg">
                    {money({ toString: () => String(subtotal) }, currency)}
                  </strong>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#68686d]">
                  Stok, sipariş gönderildiğinde rezerve edilir. Sevkiyat masrafı
                  operasyon onayında netleşir.
                </p>
              </div>
              <div className="pt-5">
                <SubmitOrderForm
                  addresses={addresses}
                  idempotencyKey={randomUUID()}
                  cartId={cart!.id}
                  cartVersion={cart!.version}
                />
              </div>
            </aside>
          </div>
        )}
      </div>
      <CommerceFooter identity={identity} />
    </main>
  );
}
