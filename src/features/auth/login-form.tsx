"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { loginWithPassword, type LoginState } from "@/features/auth/actions";

const initialState: LoginState = {
  message: "",
};

export function LoginForm({ nextPath = "/" }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(loginWithPassword, initialState);

  return (
    <form action={formAction} className="grid gap-5 rounded-lg border border-[#d9dadd] bg-white p-6">
      <input type="hidden" name="next" value={nextPath} />
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-800">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 rounded-lg border border-[#d9dadd] px-3 text-sm outline-none transition focus:border-[#00639a]"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-800">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 rounded-lg border border-[#d9dadd] px-3 text-sm outline-none transition focus:border-[#00639a]"
        />
      </div>
      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#00639a] px-5 text-sm font-semibold text-white transition hover:bg-[#004f7c] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn size={17} aria-hidden="true" />
        {pending ? "Giriş yapılıyor" : "Giriş yap"}
      </button>
    </form>
  );
}
