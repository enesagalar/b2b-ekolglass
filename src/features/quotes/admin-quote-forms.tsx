"use client";

import { Calculator, LoaderCircle, PackageCheck, RefreshCw } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import type { QuoteStatus } from "@/domain/quote-transitions";
import { getStatusLabel } from "@/domain/statuses";
import {
  convertQuoteToOrderAction,
  priceQuoteAction,
  transitionQuoteStatusAction,
} from "@/features/quotes/admin-actions";

type PriceItem = {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unitPrice: string | null;
};

type ConversionAddress = {
  id: string;
  label: string;
  line1: string;
  district: string | null;
  city: string;
  isDefault: boolean;
};

function ActionMessage({
  state,
}: {
  state: { ok?: boolean; conflict?: boolean; message?: string };
}) {
  if (!state.message) return null;
  return (
    <div
      role="status"
      className={`text-sm font-semibold ${state.ok ? "text-teal-800" : "text-red-700"}`}
    >
      <p>{state.message}</p>
      {state.conflict ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 underline"
        >
          Güncel veriyi yükle
        </button>
      ) : null}
    </div>
  );
}

export function AdminQuotePricingForm({
  quoteId,
  expectedStatus,
  expectedVersion,
  idempotencyKey,
  currency,
  internalNotes,
  items,
}: {
  quoteId: string;
  expectedStatus: QuoteStatus;
  expectedVersion: number;
  idempotencyKey: string;
  currency: string;
  internalNotes: string | null;
  items: PriceItem[];
}) {
  const [state, action, pending] = useActionState(priceQuoteAction, {});
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.id, item.unitPrice ?? ""])),
  );
  const estimate = useMemo(
    () =>
      items.reduce((total, item) => {
        const value = Number(prices[item.id]);
        return Number.isFinite(value) ? total + value * item.quantity : total;
      }, 0),
    [items, prices],
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="expectedStatus" value={expectedStatus} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="grid gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-end"
          >
            <div className="min-w-0">
              <input type="hidden" name="itemId" value={item.id} />
              <p className="font-mono text-xs font-semibold text-teal-800">
                {item.code}
              </p>
              <p className="truncate text-sm font-semibold">{item.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.quantity} adet
              </p>
            </div>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Birim fiyat
              <input
                required
                name="unitPrice"
                type="number"
                min="0.01"
                max="100000000"
                step="0.01"
                value={prices[item.id]}
                onChange={(event) =>
                  setPrices((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                className="h-10 rounded-md border border-slate-300 px-3 text-sm"
              />
            </label>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Para birimi
          <select
            name="currency"
            defaultValue={currency}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            {["TRY", "EUR", "USD"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          İç operasyon notu
          <input
            name="internalNotes"
            defaultValue={internalNotes ?? ""}
            maxLength={2000}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-col justify-between gap-3 rounded-md bg-slate-50 p-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Hesaplanan ara toplam
          </p>
          <p className="mt-1 text-lg font-semibold">
            {new Intl.NumberFormat("tr-TR", {
              style: "currency",
              currency,
            }).format(estimate)}
          </p>
        </div>
        <button
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Calculator size={17} />
          )}
          {pending ? "Kaydediliyor" : "Fiyatları kaydet"}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function AdminQuoteStatusForm({
  quoteId,
  expectedStatus,
  expectedVersion,
  idempotencyKey,
  transitions,
}: {
  quoteId: string;
  expectedStatus: QuoteStatus;
  expectedVersion: number;
  idempotencyKey: string;
  transitions: readonly QuoteStatus[];
}) {
  const [state, action, pending] = useActionState(
    transitionQuoteStatusAction,
    {},
  );
  const [targetStatus, setTargetStatus] = useState<QuoteStatus | "">(
    transitions[0] ?? "",
  );
  const noteRequired = [
    "WAITING_FOR_CUSTOMER_INFO",
    "REJECTED",
    "CANCELLED",
  ].includes(targetStatus);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="expectedStatus" value={expectedStatus} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <label className="grid gap-1 text-xs font-semibold text-slate-600">
        Yeni durum
        <select
          name="targetStatus"
          value={targetStatus}
          onChange={(event) =>
            setTargetStatus(event.target.value as QuoteStatus)
          }
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          {transitions.map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">
        Operasyon notu
        <textarea
          name="note"
          rows={3}
          maxLength={1000}
          required={noteRequired}
          className="rounded-md border border-slate-300 p-3 text-sm"
          placeholder="Durum değişikliğinin gerekçesi veya sonraki aksiyon"
        />
      </label>
      <ActionMessage state={state} />
      <button
        disabled={pending || transitions.length === 0}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <RefreshCw size={17} />
        )}
        {pending ? "Güncelleniyor" : "Durumu güncelle"}
      </button>
    </form>
  );
}

export function AdminQuoteConversionForm({
  quoteId,
  expectedVersion,
  expectedOfferRevisionId,
  idempotencyKey,
  addresses,
}: {
  quoteId: string;
  expectedVersion: number;
  expectedOfferRevisionId: string;
  idempotencyKey: string;
  addresses: ConversionAddress[];
}) {
  const [state, action, pending] = useActionState(convertQuoteToOrderAction, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <input type="hidden" name="expectedOfferRevisionId" value={expectedOfferRevisionId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <fieldset disabled={pending} className="grid gap-4 disabled:opacity-60">
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Teslimat adresi
          <select
            required
            name="deliveryAddressId"
            defaultValue={addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id}
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.label} · {address.line1} · {[address.district, address.city].filter(Boolean).join(" / ")}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Teslimat biçimi
          <select
            name="shipmentMethod"
            defaultValue="SALES_COORDINATION"
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="SALES_COORDINATION">Satış ekibiyle koordine</option>
            <option value="CITY_LOJISTIK">City Lojistik</option>
            <option value="CUSTOMER_PICKUP">Müşteri teslim alacak</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Sipariş notu
          <textarea
            name="notes"
            rows={3}
            maxLength={1000}
            className="rounded-md border border-slate-300 p-3 text-sm"
            placeholder="Teslimat veya operasyon notu"
          />
        </label>
        <button
          disabled={pending || addresses.length === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? <LoaderCircle size={17} className="animate-spin" /> : <PackageCheck size={17} />}
          {pending ? "Sipariş oluşturuluyor" : "Siparişe dönüştür"}
        </button>
      </fieldset>
      <ActionMessage state={state} />
    </form>
  );
}
