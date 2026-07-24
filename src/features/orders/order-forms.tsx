"use client";

import { LoaderCircle, MapPin, Plus, Send, ShoppingCart } from "lucide-react";
import { useActionState } from "react";

import {
  addOrderCartItemAction,
  createDealerAddressAction,
  submitOrderCartAction,
} from "@/features/orders/actions";

export function AddToOrderCartForm({
  productId,
  disabled = false,
  unavailableReason,
}: {
  productId: string;
  disabled?: boolean;
  unavailableReason?: string;
}) {
  const [state, action, pending] = useActionState(addOrderCartItemAction, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="productId" value={productId} />
      <div className="flex gap-2">
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          Adet
          <input
            name="quantity"
            type="number"
            min="1"
            max="999"
            defaultValue="1"
            disabled={disabled}
            className="h-11 w-24 rounded-md border border-slate-300 px-3 text-sm"
          />
        </label>
        <button
          disabled={pending || disabled}
          className="inline-flex h-11 flex-1 self-end items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <ShoppingCart size={17} />
          )}
          Sipariş sepetine ekle
        </button>
      </div>
      {disabled && unavailableReason ? (
        <p className="text-xs font-medium leading-5 text-amber-800">
          {unavailableReason}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-xs font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function NewAddressForm() {
  const [state, action, pending] = useActionState(
    createDealerAddressAction,
    {},
  );
  return (
    <form
      action={action}
      className="grid gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 sm:grid-cols-2"
    >
      <div className="flex items-center gap-2 sm:col-span-2">
        <MapPin size={17} className="text-teal-800" />
        <p className="text-sm font-semibold">Yeni teslimat adresi</p>
      </div>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">
        Adres etiketi
        <input
          name="label"
          required
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          placeholder="Merkez depo"
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">
        Şehir
        <input
          name="city"
          required
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">
        Açık adres
        <input
          name="line1"
          required
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">
        İlçe
        <input
          name="district"
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">
        Posta kodu
        <input
          name="postalCode"
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <input name="isDefault" type="checkbox" />
        Varsayılan adres yap
      </label>
      <button
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-teal-700 bg-white px-3 text-sm font-semibold text-teal-800"
      >
        <Plus size={16} />
        {pending ? "Ekleniyor" : "Adresi ekle"}
      </button>
      {state.message ? (
        <p
          role="status"
          className={`text-xs font-semibold sm:col-span-2 ${state.ok ? "text-teal-800" : "text-red-700"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

type CheckoutAddress = {
  id: string;
  label: string;
  line1: string;
  district: string | null;
  city: string;
  isDefault: boolean;
};

export function SubmitOrderForm({
  addresses,
  idempotencyKey,
  cartId,
  cartVersion,
}: {
  addresses: CheckoutAddress[];
  idempotencyKey: string;
  cartId: string;
  cartVersion: number;
}) {
  const [state, action, pending] = useActionState(submitOrderCartAction, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="cartId" value={cartId} />
      <input type="hidden" name="cartVersion" value={cartVersion} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-xs font-semibold uppercase text-slate-500">
          Teslimat adresi
        </legend>
        {addresses.map((address) => (
          <label
            key={address.id}
            className="flex cursor-pointer gap-3 rounded-md border border-slate-200 p-3 text-sm has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50"
          >
            <input
              type="radio"
              name="deliveryAddressId"
              value={address.id}
              defaultChecked={address.isDefault || addresses.length === 1}
              required
            />
            <span>
              <strong className="block">{address.label}</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {address.line1} ·{" "}
                {[address.district, address.city].filter(Boolean).join(" / ")}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">
        Teslimat biçimi
        <select
          name="shipmentMethod"
          defaultValue="SALES_COORDINATION"
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="SALES_COORDINATION">Satış ekibiyle koordine</option>
          <option value="CUSTOMER_PICKUP">Müşteri teslim alacak</option>
        </select>
        <span className="font-normal leading-5 text-slate-500">
          City Lojistik seçeneği entegrasyon tamamlandığında burada açılacaktır.
        </span>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">
        Sipariş notu
        <textarea
          name="notes"
          rows={3}
          className="rounded-md border border-slate-300 p-3 text-sm"
        />
      </label>
      {state.message ? (
        <p role="status" className="text-sm font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}
      <button
        disabled={pending || !addresses.length}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : (
          <Send size={18} />
        )}
        Siparişi gönder
      </button>
    </form>
  );
}
