"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { loginAdminWithPassword, type LoginState } from "@/features/auth/actions";

const initialState: LoginState = { message: "" };

export function InternalLoginForm({ nextPath = "/admin" }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(loginAdminWithPassword, initialState);

  return (
    <form action={formAction} className="grid gap-5 rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl">
      <input type="hidden" name="next" value={nextPath} />
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Kurumsal e-posta
        <input name="email" type="email" autoComplete="email" required className="h-11 rounded-md border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-teal-400" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Parola
        <input name="password" type="password" autoComplete="current-password" required className="h-11 rounded-md border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-teal-400" />
      </label>
      {state.message ? <p className="text-sm font-medium text-red-300">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60">
        <LogIn size={17} aria-hidden="true" />
        {pending ? "Doğrulanıyor" : "Yönetim sistemine gir"}
      </button>
    </form>
  );
}
