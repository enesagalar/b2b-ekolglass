"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { loginAdminWithPassword, type LoginState } from "@/features/auth/actions";

const initialState: LoginState = { message: "" };

export function InternalLoginForm({ nextPath = "/admin" }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(loginAdminWithPassword, initialState);

  return (
    <form action={formAction} className="grid gap-5 rounded-xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl sm:p-7">
      <input type="hidden" name="next" value={nextPath} />
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Kurumsal e-posta
        <input name="email" type="email" autoComplete="email" required className="h-12 rounded-lg border border-white/15 bg-black/25 px-3 text-white outline-none focus:border-[#4eb3e8]" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Parola
        <input name="password" type="password" autoComplete="current-password" required className="h-12 rounded-lg border border-white/15 bg-black/25 px-3 text-white outline-none focus:border-[#4eb3e8]" />
      </label>
      {state.message ? <p className="text-sm font-medium text-red-300">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1683bd] px-5 text-sm font-semibold text-white transition hover:bg-[#2499d4] disabled:opacity-60">
        <LogIn size={17} aria-hidden="true" />
        {pending ? "Doğrulanıyor" : "Yönetim sistemine gir"}
      </button>
    </form>
  );
}
