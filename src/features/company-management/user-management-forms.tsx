"use client";

import Link from "next/link";
import { KeyRound, PauseCircle, PlayCircle, UserPlus, UserX } from "lucide-react";
import { useActionState } from "react";

import {
  changeDealerUserStatus,
  createDealerUser,
  createPasswordResetInvitation,
  type CompanyUserActionState,
} from "@/features/company-management/actions";

const initialState: CompanyUserActionState = { ok: false, message: "" };

export function NewDealerUserForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(createDealerUser, initialState);
  return <form action={action} className="grid gap-3 border-b border-slate-200 bg-slate-50 px-5 py-5 sm:grid-cols-2 sm:items-end">
    <input type="hidden" name="companyId" value={companyId} />
    <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Ad soyad<input name="name" required minLength={2} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700" /></label>
    <label className="grid gap-1.5 text-xs font-semibold text-slate-700">E-posta<input name="email" type="email" required className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700" /></label>
    <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Yetki<select name="role" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="DEALER_STAFF">Bayi çalışanı</option><option value="DEALER_OWNER">Bayi yöneticisi</option></select></label>
    <button disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-60"><UserPlus size={16} />{pending ? "Ekleniyor" : "Kullanıcı ekle"}</button>
    {state.message ? <p role="status" className={`text-xs font-semibold sm:col-span-2 ${state.ok ? "text-teal-800" : "text-red-700"}`}>{state.message}</p> : null}
  </form>;
}

export function DealerUserStatusActions({ companyId, userId, status }: { companyId: string; userId: string; status: string }) {
  const target = status === "ACTIVE" ? "SUSPENDED" : status === "SUSPENDED" ? "ACTIVE" : "DISABLED";
  if (status === "DISABLED") return null;
  return <div className="flex flex-wrap gap-2">
    <form action={changeDealerUserStatus}><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="userId" value={userId} /><input type="hidden" name="targetStatus" value={target} /><button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{target === "ACTIVE" ? <PlayCircle size={14} /> : <PauseCircle size={14} />}{target === "ACTIVE" ? "Etkinleştir" : "Askıya al"}</button></form>
    {status !== "ACTIVE" ? <form action={changeDealerUserStatus}><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="userId" value={userId} /><input type="hidden" name="targetStatus" value="DISABLED" /><button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-800 hover:bg-red-100"><UserX size={14} />Devre dışı bırak</button></form> : null}
  </div>;
}

export function PasswordResetInvitationForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(createPasswordResetInvitation, initialState);
  return <form action={action} className="grid gap-2"><input type="hidden" name="userId" value={userId} /><button disabled={pending} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900 disabled:opacity-60"><KeyRound size={14} />{pending ? "Hazırlanıyor" : "Parola bağlantısı"}</button>{state.message ? <p role="status" className={`max-w-72 text-xs font-semibold ${state.ok ? "text-teal-800" : "text-red-700"}`}>{state.message}</p> : null}{state.resetPath ? <div className="max-w-72 rounded-md border border-teal-200 bg-teal-50 p-2"><Link href={state.resetPath} className="break-all text-xs font-semibold text-teal-900 underline">{state.resetPath}</Link><p className="mt-1 text-[11px] text-teal-800">Bağlantı iki saat geçerlidir ve tekrar gösterilmez.</p></div> : null}</form>;
}
