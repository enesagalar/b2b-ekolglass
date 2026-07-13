"use client";

import { FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { useActionState } from "react";

import {
  importProductsCsvAction,
  type ProductImportState,
} from "@/features/catalog-management/import-actions";

const initialState: ProductImportState = {};

export function ProductImportForm() {
  const [state, action, pending] = useActionState(importProductsCsvAction, initialState);

  return (
    <form action={action} className="grid gap-4">
      <label className="grid cursor-pointer gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-teal-700">
        <span className="flex items-center gap-3">
          <FileSpreadsheet size={20} className="text-teal-800" aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold text-slate-900">Ekol ürün CSV dosyası</span>
            <span className="mt-1 block text-xs text-slate-500">UTF-8 CSV, en fazla 1 MB</span>
          </span>
        </span>
        <input name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800" />
      </label>
      <p className="text-xs leading-5 text-slate-500">
        CSV fiyat veya stok içermiyor. Yeni kayıtlar taslak oluşur; yayına almak için ürün detayında net bayi fiyatı ve stok tanımlanır.
      </p>
      <button disabled={pending} className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
        {pending ? "İçe aktarılıyor" : "CSV'yi içe aktar"}
      </button>
      {state.message ? (
        <div className={`rounded-md border px-3 py-2 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <p className="font-medium">{state.message}</p>
          {state.ok ? <p className="mt-1 text-xs">{state.created} yeni · {state.updated} güncel · {state.skipped} atlanan satır</p> : null}
        </div>
      ) : null}
    </form>
  );
}
