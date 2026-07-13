"use client";

import Link from "next/link";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useActionState } from "react";

import { resetDealerPassword, type PasswordResetState } from "@/features/auth/password-reset-actions";

const initialState: PasswordResetState = { ok: false, message: "" };

export function PasswordResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetDealerPassword, initialState);

  if (state.completed) return (
    <div className="grid gap-5 rounded-lg border border-teal-200 bg-white p-6 shadow-sm">
      <CheckCircle2 className="text-teal-800" size={28} aria-hidden="true" />
      <div><h2 className="text-xl font-semibold text-slate-950">Parola yenilendi</h2><p className="mt-2 text-sm text-slate-600">{state.message}</p></div>
      <Link href="/giris" className="inline-flex h-11 items-center justify-center rounded-md bg-teal-800 px-5 text-sm font-semibold text-white">Bayi girişine git</Link>
    </div>
  );

  return (
    <form action={action} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <input type="hidden" name="token" value={token} />
      <label className="grid gap-2 text-sm font-semibold text-slate-800">Yeni parola<input name="password" type="password" autoComplete="new-password" required minLength={12} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-teal-700" /></label>
      <label className="grid gap-2 text-sm font-semibold text-slate-800">Yeni parola tekrarı<input name="passwordConfirm" type="password" autoComplete="new-password" required minLength={12} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-teal-700" /></label>
      <p className="text-xs leading-5 text-slate-500">En az 12 karakter; büyük harf, küçük harf ve rakam kullanın.</p>
      {state.message ? <p role="status" className="text-sm font-semibold text-red-700">{state.message}</p> : null}
      <button disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-60"><KeyRound size={17} />{pending ? "Yenileniyor" : "Parolayı yenile"}</button>
    </form>
  );
}
