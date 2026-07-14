"use client";

import { Check, LoaderCircle, PackageCheck, SquarePen } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import type { CatalogActionState } from "@/features/catalog-management/actions";
import { publishReadyProducts } from "@/features/catalog-management/publication-actions";

export type PublicationProductRow = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  hasGeneralPrice: boolean;
  availableStock: number;
  isReady: boolean;
};

const initialState: CatalogActionState = { ok: false, message: "" };

function ReadinessMark({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span
      className={
        ready
          ? "inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"
          : "inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700"
      }
    >
      <span
        className={
          ready
            ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100"
            : "flex h-5 w-5 items-center justify-center rounded-full bg-amber-100"
        }
        aria-hidden="true"
      >
        {ready ? <Check size={13} /> : "!"}
      </span>
      {label}
    </span>
  );
}

export function PublicationSelectionForm({ rows }: { rows: PublicationProductRow[] }) {
  const [state, action, pending] = useActionState(publishReadyProducts, initialState);
  const readyIds = useMemo(
    () => rows.filter((row) => row.isReady).map((row) => row.id),
    [rows],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allReadySelected =
    readyIds.length > 0 && readyIds.every((id) => selectedIds.includes(id));

  function toggleProduct(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function toggleAllReady() {
    setSelectedIds(allReadySelected ? [] : readyIds);
  }

  return (
    <form action={action} aria-busy={pending} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {selectedIds.map((productId) => (
        <input key={productId} type="hidden" name="productIds" value={productId} />
      ))}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={allReadySelected}
            disabled={readyIds.length === 0 || pending}
            onChange={toggleAllReady}
            className="h-4 w-4 rounded border-slate-300 accent-teal-700"
          />
          Bu sayfadaki hazır ürünleri seç
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600">{selectedIds.length} ürün seçildi</span>
          <button
            type="submit"
            disabled={selectedIds.length === 0 || pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pending ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <PackageCheck size={16} aria-hidden="true" />}
            {pending ? "Yayınlanıyor" : "Seçilenleri yayınla"}
          </button>
        </div>
      </div>

      {state.message ? (
        <p
          role="status"
          className={
            state.ok
              ? "border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
              : "border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          }
        >
          {state.message}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <PackageCheck size={28} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-800">Bu filtrede taslak ürün bulunamadı.</p>
          <p className="mt-1 text-sm text-slate-500">Filtreleri temizleyerek diğer ürünleri görüntüleyin.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead className="bg-white text-xs font-semibold text-slate-500">
                <tr>
                  <th className="w-14 px-4 py-3"><span className="sr-only">Seç</span></th>
                  <th className="px-3 py-3">Ürün</th>
                  <th className="px-3 py-3">Kategori</th>
                  <th className="px-3 py-3">Genel bayi fiyatı</th>
                  <th className="px-3 py-3">Kullanılabilir stok</th>
                  <th className="px-3 py-3">Durum</th>
                  <th className="w-16 px-4 py-3"><span className="sr-only">Düzenle</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        disabled={!row.isReady || pending}
                        onChange={() => toggleProduct(row.id)}
                        aria-label={`${row.code} ürününü seç`}
                        className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                      />
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-950">{row.code}</p>
                      <p className="mt-1 max-w-sm text-sm text-slate-600">{row.name}</p>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-600">{row.categoryName}</td>
                    <td className="px-3 py-4"><ReadinessMark ready={row.hasGeneralPrice} label={row.hasGeneralPrice ? "Tanımlı" : "Eksik"} /></td>
                    <td className="px-3 py-4"><ReadinessMark ready={row.availableStock > 0} label={row.availableStock > 0 ? `${row.availableStock} adet` : "Stok yok"} /></td>
                    <td className="px-3 py-4">
                      <span className={row.isReady ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800" : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"}>
                        {row.isReady ? "Yayına hazır" : "Eksikleri var"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/admin/urunler/${row.id}`} title="Ürünü düzenle" aria-label={`${row.code} ürününü düzenle`} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-teal-700 hover:text-teal-800">
                        <SquarePen size={16} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-200 md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    disabled={!row.isReady || pending}
                    onChange={() => toggleProduct(row.id)}
                    aria-label={`${row.code} ürününü seç`}
                    className="mt-1 h-4 w-4 rounded border-slate-300 accent-teal-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{row.code}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">{row.name}</p>
                      </div>
                      <Link href={`/admin/urunler/${row.id}`} title="Ürünü düzenle" aria-label={`${row.code} ürününü düzenle`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600">
                        <SquarePen size={16} aria-hidden="true" />
                      </Link>
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-500">{row.categoryName}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <ReadinessMark ready={row.hasGeneralPrice} label={row.hasGeneralPrice ? "Genel fiyat tanımlı" : "Genel fiyat eksik"} />
                      <ReadinessMark ready={row.availableStock > 0} label={row.availableStock > 0 ? `${row.availableStock} adet kullanılabilir` : "Kullanılabilir stok yok"} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </form>
  );
}
