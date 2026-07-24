import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  applyPriceImportBatch,
  cancelPriceImportBatch,
  revertPriceBatch,
} from "@/features/catalog-management/price-import-actions";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PriceImportDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/urunler/fiyat-aktarimi/[id]">) {
  const actor = await requirePermissionUser(
    "price.manage",
    "/admin/urunler/fiyat-aktarimi",
  );
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const batch = await prisma.catalogImportBatch.findFirst({
    where: {
      id,
      createdById: actor.id,
      kind: { in: ["PRICE", "PRICE_ADJUSTMENT"] },
    },
    include: {
      priceList: true,
      rows: {
        orderBy: { rowNumber: "asc" },
        include: { product: { select: { name: true } } },
      },
    },
  });
  if (!batch) notFound();

  const applyAction = applyPriceImportBatch.bind(null, batch.id);
  const cancelAction = cancelPriceImportBatch.bind(null, batch.id);
  const revertAction = revertPriceBatch.bind(null, batch.id);
  const canApply =
    batch.kind === "PRICE" &&
    batch.status === "PREVIEW" &&
    batch.invalidRows === 0;

  return (
    <div className="grid gap-6">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-[#00639a]">
            {batch.kind === "PRICE_ADJUSTMENT"
              ? "Toplu fiyat güncellemesi"
              : "Excel fiyat önizlemesi"}
          </p>
          <h2 className="mt-2 break-words text-2xl font-semibold text-slate-950">
            {batch.fileName}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {batch.priceList.name} · {batch.priceList.currency} ·{" "}
            {batch.totalRows} satır
          </p>
        </div>
        <Link
          href="/admin/urunler/fiyat-aktarimi"
          className="text-sm font-semibold text-[#00639a]"
        >
          Fiyat işlemlerine dön
        </Link>
      </header>

      {param(query.error) ? (
        <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle size={18} />
          <span>{param(query.error)}</span>
        </div>
      ) : null}
      {param(query.success) ? (
        <div className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 size={18} />
          <span>{param(query.success)}</span>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
        {[
          ["Toplam", batch.totalRows],
          ["Geçerli", batch.validRows],
          ["Hatalı", batch.invalidRows],
          [
            "Durum",
            {
              PREVIEW: "Önizleme",
              APPLIED: "Uygulandı",
              CANCELLED: "İptal",
              REVERTED: "Geri alındı",
            }[batch.status] ?? batch.status,
          ],
        ].map(([label, value]) => (
          <div key={label} className="bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Satır</th>
                <th className="px-4 py-3">Ürün</th>
                <th className="px-4 py-3">Minimum adet</th>
                <th className="px-4 py-3 text-right">Önceki fiyat</th>
                <th className="px-4 py-3 text-right">Yeni fiyat</th>
                <th className="px-4 py-3">Kontrol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batch.rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.errorMessage ? "bg-red-50/60" : undefined}
                >
                  <td className="px-4 py-3 text-slate-500">{row.rowNumber}</td>
                  <td className="px-4 py-3">
                    <strong>{row.productCode}</strong>
                    <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                      {row.product?.name ?? "Katalogda bulunamadı"}
                    </p>
                  </td>
                  <td className="px-4 py-3">{row.minQuantity ?? "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.previousPrice?.toString() ?? "Yeni kayıt"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {row.netPrice?.toString() ?? "-"} {batch.priceList.currency}
                  </td>
                  <td className="max-w-sm px-4 py-3">
                    <span
                      className={
                        row.errorMessage
                          ? "font-medium text-red-800"
                          : "font-semibold text-emerald-700"
                      }
                    >
                      {row.errorMessage ?? "Geçerli"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {batch.status === "PREVIEW" ? (
        <section className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Onay sırasında tüm satırlar yeniden kontrol edilir. Bir fiyat
            önizlemeden sonra değiştiyse işlemin tamamı durdurulur.
          </p>
          <div className="flex gap-2">
            <form action={cancelAction}>
              <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold">
                İptal et
              </button>
            </form>
            <form action={applyAction}>
              <button
                disabled={!canApply}
                className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Fiyatları uygula
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {batch.status === "APPLIED" ? (
        <section className="flex flex-col justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-sm leading-6 text-amber-950">
            Sonraki bir işlem bu fiyatları değiştirmediyse tüm satırları önceki
            değerlerine atomik olarak döndürebilirsiniz.
          </p>
          <form action={revertAction}>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-amber-400 bg-white px-4 text-sm font-semibold text-amber-950">
              <RotateCcw size={16} />
              İşlemi geri al
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
