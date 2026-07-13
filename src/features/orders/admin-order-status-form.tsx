"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { useActionState, useState } from "react";

import type { OrderStatus } from "@/domain/order-transitions";
import { getStatusLabel } from "@/domain/statuses";
import {
  transitionOrderStatusAction,
  type AdminOrderActionState,
} from "@/features/orders/admin-actions";

const initialState: AdminOrderActionState = { ok: false, message: "" };

export function AdminOrderStatusForm({
  orderId,
  expectedStatus,
  expectedVersion,
  idempotencyKey,
  transitions,
}: {
  orderId: string;
  expectedStatus: OrderStatus;
  expectedVersion: number;
  idempotencyKey: string;
  transitions: readonly OrderStatus[];
}) {
  const [state, action, pending] = useActionState(
    transitionOrderStatusAction,
    initialState,
  );
  const [selectedStatus, setSelectedStatus] = useState("");

  if (!transitions.length) {
    return (
      <p className="text-sm leading-6 text-slate-500">
        Bu sipariş için yetkinize uygun yeni bir geçiş bulunmuyor.
      </p>
    );
  }

  return (
    <form
      action={action}
      className="grid gap-4"
      aria-busy={pending}
      onSubmit={(event) => {
        if (["CANCELLED", "SHIPPED"].includes(selectedStatus)) {
          const label =
            selectedStatus === "CANCELLED" ? "iptal" : "sevk ve stok tüketimi";
          if (
            !window.confirm(
              `Bu ${label} işlemi geri alınamaz. Devam edilsin mi?`,
            )
          )
            event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="expectedStatus" value={expectedStatus} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <fieldset disabled={pending} className="grid gap-4">
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Yeni durum
          <select
            name="targetStatus"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
            required
          >
            <option value="">Durum seçin</option>
            {transitions.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        {selectedStatus === "SHIPPED" ? (
          <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Taşıyıcı
              <input
                name="carrier"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                placeholder="City Lojistik"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Takip numarası
              <input
                name="trackingNumber"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
          </div>
        ) : null}

        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Operasyon notu
          <textarea
            name="note"
            rows={3}
            maxLength={1000}
            required={["CANCELLED", "ON_HOLD"].includes(selectedStatus)}
            className="rounded-md border border-slate-300 bg-white p-3 text-sm"
            placeholder="Bu değişikliğin gerekçesi veya sonraki aksiyon"
          />
        </label>
        <p className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          İptal aktif rezervasyonu serbest bırakır. Sevk edildi geçişi fiziksel
          stoktan düşer ve geri alınamaz.
        </p>
        {state.message ? (
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
        ) : null}
        <button
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <RefreshCw size={17} />
          )}
          {pending ? "Güncelleniyor" : "Durumu güncelle"}
        </button>
      </fieldset>
    </form>
  );
}
