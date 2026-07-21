"use client";

import { PauseCircle, PlayCircle } from "lucide-react";
import { useActionState } from "react";

import {
  changeCompanyStatus,
  type CompanyLifecycleActionState,
} from "@/features/company-management/actions";

const initialState: CompanyLifecycleActionState = { ok: false, message: "" };

export function CompanyLifecycleForm({
  companyId,
  status,
  updatedAt,
}: {
  companyId: string;
  status: string;
  updatedAt: string;
}) {
  const [state, action, pending] = useActionState(changeCompanyStatus, initialState);
  if (status !== "APPROVED" && status !== "SUSPENDED") return null;

  const suspending = status === "APPROVED";
  const targetStatus = suspending ? "SUSPENDED" : "APPROVED";
  const Icon = suspending ? PauseCircle : PlayCircle;

  return (
    <form
      action={action}
      className="border-t border-slate-200 px-5 py-5"
      aria-busy={pending}
      onSubmit={suspending ? (event) => {
        if (!window.confirm("Bu firmadaki tüm açık oturumlar kapatılacak ve credential bağlantıları iptal edilecek. Devam edilsin mi?")) {
          event.preventDefault();
        }
      } : undefined}
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="expectedStatus" value={status} />
      <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
      <input type="hidden" name="targetStatus" value={targetStatus} />
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${suspending ? "bg-red-50 text-red-800" : "bg-teal-50 text-teal-800"}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {suspending ? "Firma erişimini askıya al" : "Firma erişimini yeniden aç"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {suspending
              ? "Tüm bayi oturumları kapatılır; açık aktivasyon ve parola bağlantıları iptal edilir. Sipariş geçmişi silinmez."
              : "Firma tekrar giriş ve sipariş erişimine açılır. Kullanıcı hesap durumları ayrıca korunur."}
          </p>
        </div>
      </div>
      <label className="mt-4 grid gap-1.5 text-xs font-semibold text-slate-700">
        İşlem gerekçesi
        <textarea
          name="changeReason"
          rows={3}
          minLength={10}
          maxLength={500}
          required
          className="rounded-md border border-slate-300 bg-white p-3 text-sm outline-none focus:border-teal-700"
          placeholder={suspending ? "Firma erişiminin neden kapatıldığını yazın" : "Firma erişiminin neden yeniden açıldığını yazın"}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className={`mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60 ${suspending ? "bg-red-700 hover:bg-red-600" : "bg-teal-800 hover:bg-teal-700"}`}
      >
        <Icon size={16} aria-hidden="true" />
        {pending ? "İşleniyor" : suspending ? "Firmayı askıya al" : "Firmayı yeniden etkinleştir"}
      </button>
      {state.message ? (
        <p role="status" className={`mt-3 text-xs font-semibold ${state.ok ? "text-teal-800" : "text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
