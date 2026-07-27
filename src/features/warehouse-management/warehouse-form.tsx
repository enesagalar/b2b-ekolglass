"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import {
  saveWarehouse,
  type WarehouseActionState,
} from "@/features/warehouse-management/actions";

const initialState: WarehouseActionState = { ok: false, message: "" };
const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700 disabled:bg-slate-100 disabled:text-slate-500";
const labelClass = "grid gap-1.5 text-xs font-semibold text-slate-700";

type WarehouseFormValue = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  addressLine: string | null;
  district: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string;
  updatedAt: string;
};

export function WarehouseForm({
  warehouse,
}: {
  warehouse?: WarehouseFormValue;
}) {
  const [state, formAction, pending] = useActionState(
    saveWarehouse,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4" aria-busy={pending}>
      {warehouse ? (
        <>
          <input type="hidden" name="id" value={warehouse.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={warehouse.updatedAt}
          />
          <input type="hidden" name="code" value={warehouse.code} />
        </>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className={labelClass}>
          Depo kodu
          <input
            name={warehouse ? undefined : "code"}
            required
            disabled={Boolean(warehouse)}
            defaultValue={warehouse?.code ?? ""}
            placeholder="MERKEZ"
            maxLength={40}
            className={inputClass}
          />
          <span className="font-normal leading-5 text-slate-500">
            {warehouse
              ? "Stok geçmişi olduğu için kod değiştirilemez."
              : "Büyük harf, rakam, _ veya - kullanın."}
          </span>
        </label>
        <label className={labelClass}>
          Depo adı
          <input
            name="name"
            required
            defaultValue={warehouse?.name ?? ""}
            placeholder="Merkez Depo"
            maxLength={120}
            className={inputClass}
          />
        </label>
      </div>
      <label className={labelClass}>
        Teslimat adresi
        <input
          name="addressLine"
          defaultValue={warehouse?.addressLine ?? ""}
          placeholder="Cadde, sokak, bina ve kapı numarası"
          maxLength={240}
          className={inputClass}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          İlçe
          <input
            name="district"
            defaultValue={warehouse?.district ?? ""}
            maxLength={100}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Şehir
          <input
            name="city"
            defaultValue={warehouse?.city ?? ""}
            maxLength={100}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Posta kodu
          <input
            name="postalCode"
            defaultValue={warehouse?.postalCode ?? ""}
            maxLength={20}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Ülke
          <input
            name="countryCode"
            required
            defaultValue={warehouse?.countryCode ?? "TR"}
            maxLength={2}
            className={inputClass}
          />
        </label>
      </div>
      <label className="flex items-start gap-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={warehouse?.isActive ?? true}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <span>
          <span className="block font-semibold">Yeni stok işlemlerinde kullan</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Pasif depolar geçmiş kayıtlarda görünür ancak yeni stok satırlarında
            seçilemez.
          </span>
        </span>
      </label>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={
            state.ok
              ? "text-sm font-semibold text-teal-800"
              : "text-sm font-semibold text-red-700"
          }
        >
          {state.message}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-400"
        >
          <Save size={16} aria-hidden="true" />
          {pending
            ? "Kaydediliyor..."
            : warehouse
              ? "Depoyu güncelle"
              : "Depoyu oluştur"}
        </button>
      </div>
    </form>
  );
}
