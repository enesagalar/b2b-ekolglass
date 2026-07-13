"use client";

import { Percent, Save } from "lucide-react";
import { useActionState } from "react";

import {
  type CompanyUserActionState,
  updateCompanyDiscount,
} from "@/features/company-management/actions";

const initialState: CompanyUserActionState = { ok: false, message: "" };

export function CompanyDiscountForm({
  companyId,
  discountRate,
}: {
  companyId: string;
  discountRate: string;
}) {
  const [state, action, pending] = useActionState(updateCompanyDiscount, initialState);

  return (
    <form action={action} className="border-t border-slate-200 px-5 py-5" aria-busy={pending}>
      <input type="hidden" name="companyId" value={companyId} />
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800">
          <Percent size={17} aria-hidden="true" />
        </span>
        <div>
          <label htmlFor="company-discount" className="text-sm font-semibold text-slate-950">
            Müşteri iskontosu
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Genel bayi fiyatına uygulanır. Firma özel net fiyatı varsa ayrıca iskonto uygulanmaz.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-1.5 text-xs font-semibold text-slate-700">
          İskonto oranı (%)
          <input
            id="company-discount"
            name="discountRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            defaultValue={discountRate}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          <Save size={16} aria-hidden="true" />
          {pending ? "Kaydediliyor" : "İskontoyu kaydet"}
        </button>
      </div>
      {state.message ? (
        <p role="status" className={`mt-3 text-xs font-semibold ${state.ok ? "text-teal-800" : "text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
