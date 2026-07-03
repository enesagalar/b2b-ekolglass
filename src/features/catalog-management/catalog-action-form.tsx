"use client";

import { type ReactNode, useActionState } from "react";

import type { CatalogActionState } from "@/features/catalog-management/actions";

type CatalogAction = (previousState: CatalogActionState, formData: FormData) => Promise<CatalogActionState>;

const initialState: CatalogActionState = {
  ok: false,
  message: "",
};

export function CatalogActionForm({
  action,
  children,
  className,
}: {
  action: CatalogAction;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={className} aria-busy={pending}>
      {children}
      {state.message ? (
        <p className={state.ok ? "text-sm font-semibold text-teal-800" : "text-sm font-semibold text-red-700"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
