"use client";

import { type ReactNode, useActionState } from "react";

import type { DealerApplicationAdminState } from "@/features/dealer-applications/admin-actions";

type DealerApplicationAdminAction = (
  previousState: DealerApplicationAdminState,
  formData: FormData,
) => Promise<DealerApplicationAdminState>;

const initialState: DealerApplicationAdminState = {
  ok: false,
  message: "",
};

export function DealerApplicationAdminForm({
  action,
  children,
  className,
}: {
  action: DealerApplicationAdminAction;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={className} aria-busy={pending}>
      {children}
      {state.message ? (
        <p
          role="status"
          className={state.ok ? "text-sm font-semibold text-teal-800" : "text-sm font-semibold text-red-700"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
