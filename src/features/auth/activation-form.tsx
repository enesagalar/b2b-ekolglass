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
      <div className="surface-panel grid gap-5 p-6 sm:p-7">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e8f4fa] text-[#00639a]">
          <CheckCircle2 size={23} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Hesap kullanıma hazır</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
        </div>
        <Link
          href="/giris?activated=1&next=/"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-[#00639a] px-5 text-sm font-semibold text-white transition hover:bg-[#004f7b]"
        >
          Giriş ekranına git
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="surface-panel grid gap-5 p-6 sm:p-7">
      <input type="hidden" name="token" value={token} />
      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        Yeni parola
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#00639a]"
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
          className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#00639a]"
        />
      </label>
      <p className="text-xs leading-5 text-slate-500">
        En az 12 karakter; büyük harf, küçük harf ve rakam kullanın.
      </p>
      {state.message ? <p role="status" className="text-sm font-semibold text-red-700">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#00639a] px-5 text-sm font-semibold text-white transition hover:bg-[#004f7b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <KeyRound size={17} aria-hidden="true" />
        {pending ? "Hesap aktifleştiriliyor" : "Parolayı belirle ve aktifleştir"}
      </button>
    </form>
  );
}
