"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { useActionState } from "react";

import {
  createActivationInvitationForm,
  type ActivationInvitationState,
} from "@/features/company-management/actions";

const initialState: ActivationInvitationState = {
  ok: false,
  message: "",
};

export function ActivationInvitationForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(createActivationInvitationForm, initialState);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <KeyRound size={15} aria-hidden="true" />
        {pending ? "Hazırlanıyor" : "Aktivasyon bağlantısı üret"}
      </button>
      {state.message ? (
        <p role="status" className={state.ok ? "text-xs font-semibold text-teal-800" : "text-xs font-semibold text-red-700"}>
          {state.message}
        </p>
      ) : null}
      {state.activationPath ? (
        <div className="grid gap-2 rounded-md border border-teal-200 bg-teal-50 p-3">
          <Link
            href={state.activationPath}
            className="break-all text-xs font-semibold text-teal-900 underline underline-offset-2"
          >
            {state.activationPath}
          </Link>
          <p className="text-xs leading-5 text-teal-800">
            Bağlantı {state.expiresAt ? new Date(state.expiresAt).toLocaleString("tr-TR") : "48 saat içinde"} sona erer.
            Bu ekran kapatıldıktan sonra ham bağlantı tekrar gösterilmez.
          </p>
        </div>
      ) : null}
    </form>
  );
}
