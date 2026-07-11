"use client";

import Link from "next/link";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useActionState } from "react";

import { activateInvitedAccount, type AccountActivationState } from "@/features/auth/activation-actions";

const initialState: AccountActivationState = {
  ok: false,
  message: "",
};

export function AccountActivationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(activateInvitedAccount, initialState);

  if (state.activated) {
    return (
      <div className="grid gap-5 rounded-lg border border-teal-200 bg-white p-6 shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-teal-800">
          <CheckCircle2 size={23} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Hesap kullanıma hazır</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
        </div>
        <Link
          href="/giris"
          className="inline-flex h-11 items-center justify-center rounded-md bg-teal-800 px-5 text-sm font-semibold text-white transition hover:bg-teal-900"
        >
          Giriş ekranına git
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <input type="hidden" name="token" value={token} />
      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        Yeni parola
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-700"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        Yeni parola tekrarı
        <input
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-700"
        />
      </label>
      <p className="text-xs leading-5 text-slate-500">
        En az 12 karakter; büyük harf, küçük harf ve rakam kullanın.
      </p>
      {state.message ? <p role="status" className="text-sm font-semibold text-red-700">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <KeyRound size={17} aria-hidden="true" />
        {pending ? "Hesap aktifleştiriliyor" : "Parolayı belirle ve aktifleştir"}
      </button>
    </form>
  );
}
