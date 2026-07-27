"use client";

import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  createStockTransfer,
  type StockTransferActionState,
} from "./actions";

type SourceOption = {
  id: string;
  productId: string;
  warehouseCode: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  product: { code: string; name: string };
  warehouse: { name: string };
};

type WarehouseOption = {
  code: string;
  name: string;
};

const initialState: StockTransferActionState = {
  ok: false,
  message: "",
};
const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

export function StockTransferForm({
  sourceOptions,
  warehouses,
  initialIdempotencyKey,
}: {
  sourceOptions: SourceOption[];
  warehouses: WarehouseOption[];
  initialIdempotencyKey: string;
}) {
  const [state, action, pending] = useActionState(
    createStockTransfer,
    initialState,
  );
  const [selectedSourceId, setSelectedSourceId] = useState(
    sourceOptions[0]?.id ?? "",
  );
  const selectedSource = useMemo(
    () => sourceOptions.find((option) => option.id === selectedSourceId),
    [selectedSourceId, sourceOptions],
  );

  if (warehouses.length < 2) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <p className="font-semibold">Transfer için ikinci aktif depo gerekli</p>
        <p className="mt-1">
          Kaynak ve hedef depo farklı olmalıdır. Önce depo ana verisinde ikinci
          depoyu oluşturup aktif hale getirin.
        </p>
        <Link
          href="/admin/stok/depolar"
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-amber-950 underline underline-offset-2"
        >
          Depo yönetimine git
        </Link>
      </div>
    );
  }

  if (!sourceOptions.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Kullanılabilir stoğu bulunan kaynak kaydı yok. Ürün koduyla arama yapın
        veya önce stok girişini tamamlayın.
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5">
      <input
        type="hidden"
        name="idempotencyKey"
        value={initialIdempotencyKey}
      />
      <input
        type="hidden"
        name="productId"
        value={selectedSource?.productId ?? ""}
      />
      <input
        type="hidden"
        name="sourceWarehouseCode"
        value={selectedSource?.warehouseCode ?? ""}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
          Taşınacak ürün ve kaynak depo
          <select
            value={selectedSourceId}
            onChange={(event) => setSelectedSourceId(event.target.value)}
            className={inputClass}
          >
            {sourceOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.product.code} · {option.warehouse.name} ·{" "}
                {option.availableQuantity} kullanılabilir
              </option>
            ))}
          </select>
          <span className="text-xs font-normal leading-5 text-slate-500">
            {selectedSource?.product.name}
          </span>
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
          Hedef depo
          <select
            name="destinationWarehouseCode"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Hedef depoyu seçin
            </option>
            {warehouses
              .filter(
                (warehouse) =>
                  warehouse.code !== selectedSource?.warehouseCode,
              )
              .map((warehouse) => (
                <option key={warehouse.code} value={warehouse.code}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
          </select>
          <span className="text-xs font-normal leading-5 text-slate-500">
            Hedefte kayıt yoksa sistem otomatik stok satırı açar.
          </span>
        </label>
      </div>

      {selectedSource ? (
        <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500">Kaynak bakiye</p>
            <p className="mt-2 font-semibold text-slate-950">
              {selectedSource.warehouse.name}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {selectedSource.quantity} fiziksel ·{" "}
              {selectedSource.reservedQuantity} rezerve ·{" "}
              {selectedSource.availableQuantity} kullanılabilir
            </p>
          </div>
          <ArrowRight
            size={18}
            className="mx-4 hidden text-teal-800 sm:block"
            aria-hidden="true"
          />
          <div className="border-t border-slate-200 p-4 sm:border-l sm:border-t-0">
            <p className="text-xs font-semibold text-slate-500">
              Transfer kuralı
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Yalnız kullanılabilir stok taşınır. Siparişlere ayrılan{" "}
              {selectedSource.reservedQuantity} adet kaynak depoda kalır.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(160px,0.3fr)_minmax(0,1fr)]">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
          Transfer adedi
          <input
            name="quantity"
            type="number"
            min={1}
            max={selectedSource?.availableQuantity ?? 1}
            required
            className={inputClass}
          />
          <span className="text-xs font-normal text-slate-500">
            En fazla {selectedSource?.availableQuantity ?? 0} adet
          </span>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
          Operasyon gerekçesi
          <textarea
            name="reason"
            required
            minLength={10}
            maxLength={500}
            rows={3}
            placeholder="Örn. Ankara deposunun haftalık satış ihtiyacı"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </div>

      <label className="flex min-h-11 items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          name="confirmed"
          required
          className="mt-1 h-4 w-4 rounded border-slate-300 accent-teal-800"
        />
        Kaynak stok azalırken hedef stoğun aynı anda artacağını ve işlemin
        hareket defterine kalıcı olarak kaydedileceğini onaylıyorum.
      </label>

      {state.message ? (
        <div
          role={state.ok ? "status" : "alert"}
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {state.ok ? (
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          ) : null}
          <span>
            {state.message}
            {state.transferNumber ? (
              <>
                <strong className="ml-1">No: {state.transferNumber}</strong>
                <Link
                  href="/admin/stok/transferler"
                  className="ml-2 font-semibold underline underline-offset-2"
                >
                  Yeni transfer
                </Link>
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || !selectedSource}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 lg:justify-self-end"
      >
        {pending ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <ArrowRight size={17} />
        )}
        {pending ? "Transfer uygulanıyor" : "Transferi tamamla"}
      </button>
    </form>
  );
}
