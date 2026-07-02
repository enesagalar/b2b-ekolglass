"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { loginWithPassword, type LoginState } from "@/features/auth/actions";

const initialState: LoginState = {
  message: "",
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginWithPassword, initialState);

  return (
    <form action={formAction} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
          className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-700"
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
          className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-700"
        />
      </div>
      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn size={17} aria-hidden="true" />
        {pending ? "Giriş yapılıyor" : "Giriş yap"}
      </button>
    </form>
  );
}
