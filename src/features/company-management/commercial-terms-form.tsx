"use client";

import { Percent, Save } from "lucide-react";
import { useActionState, useState } from "react";

import {
  type CompanyUserActionState,
  updateCompanyDiscount,
} from "@/features/company-management/actions";

const initialState: CompanyUserActionState = { ok: false, message: "" };

export function CompanyDiscountForm({
  companyId,
  updatedAt,
  discountRate,
  paymentTerms,
  creditPolicy,
  creditLimit,
}: {
  companyId: string;
  updatedAt: string;
  discountRate: string;
  paymentTerms: string;
  creditPolicy: string;
  creditLimit: string;
}) {
  const [state, action, pending] = useActionState(updateCompanyDiscount, initialState);
  const [policy, setPolicy] = useState(creditPolicy);

  return (
    <form action={action} className="border-t border-slate-200 px-5 py-5" aria-busy={pending}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800">
          <Percent size={17} aria-hidden="true" />
        </span>
        <div>
          <label htmlFor="company-discount" className="text-sm font-semibold text-slate-950">
            Ticari koşulları düzenle
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Fiyat iskontosu, ödeme koşulu ve kredi politikası yeni sipariş değerlendirmelerinde kullanılır.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
          Ödeme koşulu
          <input name="paymentTerms" defaultValue={paymentTerms} placeholder="30 gün" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
          Kredi politikası
          <select name="creditPolicy" value={policy} onChange={(event) => setPolicy(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
            <option value="UNSET">Tanımlanmadı</option>
            <option value="LIMITED">Limitli</option>
            <option value="UNLIMITED">Limitsiz</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
          Kredi limiti (TRY)
          <input name="creditLimit" type="number" min="0" step="0.01" required={policy === "LIMITED"} disabled={policy !== "LIMITED"} defaultValue={creditLimit} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100" />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">
          Değişiklik gerekçesi
          <textarea name="changeReason" rows={2} minLength={10} maxLength={500} required className="rounded-md border border-slate-300 bg-white p-3 text-sm" placeholder="Ticari koşul değişikliğinin gerekçesi" />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:col-span-2 sm:justify-self-end"
        >
          <Save size={16} aria-hidden="true" />
          {pending ? "Kaydediliyor" : "Ticari koşulları kaydet"}
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
