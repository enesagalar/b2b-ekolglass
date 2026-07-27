"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import { useActionState } from "react";

import {
  cancelStockCount,
  completeStockCount,
  type StockCountActionState,
} from "./actions";

const initialState: StockCountActionState = {
  ok: false,
  message: "",
};

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";
const textAreaClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

function ActionMessage({ state }: { state: StockCountActionState }) {
  if (!state.message) return null;
  const reviewRequired =
    !state.ok && state.message.includes("kaydedildi ancak");

  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm leading-6 ${
        state.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : reviewRequired
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {state.ok ? (
        <CheckCircle2 size={17} className="mt-1 shrink-0" aria-hidden="true" />
      ) : reviewRequired ? (
        <AlertTriangle size={17} className="mt-1 shrink-0" aria-hidden="true" />
      ) : (
        <XCircle size={17} className="mt-1 shrink-0" aria-hidden="true" />
      )}
      <span>{state.message}</span>
    </div>
  );
}

export function StockCountSessionActions({
  sessionId,
  expectedQuantity,
  reservedQuantity,
  completionIdempotencyKey,
  cancellationIdempotencyKey,
}: {
  sessionId: string;
  expectedQuantity: number;
  reservedQuantity: number;
  completionIdempotencyKey: string;
  cancellationIdempotencyKey: string;
}) {
  const [completionState, completionAction, completionPending] = useActionState(
    completeStockCount,
    initialState,
  );
  const [cancellationState, cancellationAction, cancellationPending] =
    useActionState(cancelStockCount, initialState);

  return (
    <div className="grid gap-4">
      <form action={completionAction} className="grid gap-4">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input
          type="hidden"
          name="idempotencyKey"
          value={completionIdempotencyKey}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(150px,0.32fr)_minmax(0,1fr)]">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
            Fiziksel sayım
            <input
              name="countedQuantity"
              type="number"
              inputMode="numeric"
              min={0}
              required
              className={inputClass}
              placeholder={String(expectedQuantity)}
            />
            <span className="text-xs font-normal leading-5 text-slate-500">
              Rafta bulunan toplam adet. En az {reservedQuantity} rezerve ürün
              bulunmalıdır.
            </span>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
            Sayım gerekçesi ve notu
            <textarea
              name="reason"
              required
              minLength={10}
              maxLength={500}
              rows={3}
              placeholder="Örn. Aylık depo sayımı, A rafı fiziksel kontrolü"
              className={textAreaClass}
            />
          </label>
        </div>

        <label className="flex min-h-11 items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <input
            type="checkbox"
            name="confirmed"
            required
            className="mt-1 h-4 w-4 rounded border-slate-300 accent-teal-800"
          />
          Girdiğim miktarın fiziksel sayım sonucu olduğunu ve uygun farkın stok
          bakiyesine işleneceğini onaylıyorum.
        </label>

        <ActionMessage state={completionState} />

        <button
          type="submit"
          disabled={completionPending || cancellationPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 sm:justify-self-end"
        >
          {completionPending ? (
            <LoaderCircle
              size={17}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2 size={17} aria-hidden="true" />
          )}
          {completionPending ? "Sonuç işleniyor" : "Sayımı tamamla"}
        </button>
      </form>

      <details className="group border-t border-slate-200 pt-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-600 hover:text-slate-950">
          Sayımı sonuç girmeden iptal et
          <ChevronDown
            size={17}
            className="transition group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <form action={cancellationAction} className="mt-3 grid gap-3">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={cancellationIdempotencyKey}
          />
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
            İptal gerekçesi
            <textarea
              name="reason"
              required
              minLength={10}
              maxLength={500}
              rows={2}
              placeholder="Örn. Yanlış depo seçildi, sayım yeniden planlandı"
              className={textAreaClass}
            />
          </label>
          <ActionMessage state={cancellationState} />
          <button
            type="submit"
            disabled={completionPending || cancellationPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:justify-self-end"
          >
            {cancellationPending ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <XCircle size={17} aria-hidden="true" />
            )}
            {cancellationPending ? "İptal ediliyor" : "Oturumu iptal et"}
          </button>
        </form>
      </details>
    </div>
  );
}
