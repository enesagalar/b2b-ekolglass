"use client";

import { CheckCircle2, ClipboardPlus, LoaderCircle } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { openStockCount, type StockCountActionState } from "./actions";

type StockCountCandidate = {
  id: string;
  productId: string;
  warehouseCode: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  product: { code: string; name: string };
  warehouse: { name: string };
};

const initialState: StockCountActionState = {
  ok: false,
  message: "",
};

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

export function StockCountOpenForm({
  candidates,
  initialIdempotencyKey,
}: {
  candidates: StockCountCandidate[];
  initialIdempotencyKey: string;
}) {
  const [state, action, pending] = useActionState(openStockCount, initialState);
  const [selectedId, setSelectedId] = useState(candidates[0]?.id ?? "");
  const selected = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedId),
    [candidates, selectedId],
  );

  if (!candidates.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Arama ölçütüne uygun, açık sayımı bulunmayan stok kaydı yok. Farklı bir
        ürün kodu arayın veya aşağıdaki açık sayımları tamamlayın.
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

      <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
        Sayılacak ürün ve depo
        <select
          name="stockItemId"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          required
          className={inputClass}
        >
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.product.code} · {candidate.warehouse.name} ·{" "}
              {candidate.quantity} adet
            </option>
          ))}
        </select>
        <span className="text-xs font-normal leading-5 text-slate-500">
          {selected?.product.name}
        </span>
      </label>

      {selected ? (
        <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:grid-cols-3">
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500">
              Sistem bakiyesi
            </p>
            <p className="mt-2 text-lg font-semibold tabular-nums text-slate-950">
              {selected.quantity.toLocaleString("tr-TR")} adet
            </p>
          </div>
          <div className="border-t border-slate-200 p-4 sm:border-l sm:border-t-0">
            <p className="text-xs font-semibold text-slate-500">Rezerve</p>
            <p className="mt-2 text-lg font-semibold tabular-nums text-slate-950">
              {selected.reservedQuantity.toLocaleString("tr-TR")} adet
            </p>
          </div>
          <div className="border-t border-slate-200 p-4 sm:border-l sm:border-t-0">
            <p className="text-xs font-semibold text-slate-500">
              Kullanılabilir
            </p>
            <p className="mt-2 text-lg font-semibold tabular-nums text-teal-800">
              {selected.availableQuantity.toLocaleString("tr-TR")} adet
            </p>
          </div>
        </div>
      ) : null}

      <p className="text-sm leading-6 text-slate-600">
        Oturum açıldığında mevcut stok bakiyesi sabit bir referans olarak
        kaydedilir. Fiziksel sayımı açık sayımlar bölümünden sonuçlandırırsınız.
      </p>

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
            {state.countNumber ? (
              <strong className="ml-1">No: {state.countNumber}</strong>
            ) : null}
          </span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || !selected}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 sm:justify-self-end"
      >
        {pending ? (
          <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
        ) : (
          <ClipboardPlus size={17} aria-hidden="true" />
        )}
        {pending ? "Oturum açılıyor" : "Sayım oturumu aç"}
      </button>
    </form>
  );
}
