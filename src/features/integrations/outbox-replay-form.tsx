"use client";

import { RotateCcw } from "lucide-react";
import { useActionState } from "react";

import {
  replayOutboxEventAction,
  type OutboxReplayState,
} from "./actions";

const initialState: OutboxReplayState = { ok: false, message: "" };

export function OutboxReplayForm({
  eventId,
  requestId,
  status,
  attempts,
  updatedAt,
}: {
  eventId: string;
  requestId: string;
  status: "DEAD" | "RETRY";
  attempts: number;
  updatedAt: string;
}) {
  const [state, action, pending] = useActionState(
    replayOutboxEventAction,
    initialState,
  );

  return (
    <form action={action} className="grid justify-items-end gap-2" aria-busy={pending}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="expectedStatus" value={status} />
      <input type="hidden" name="expectedAttempts" value={attempts} />
      <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
      {status === "DEAD" ? (
        <input
          name="reason"
          required
          minLength={10}
          maxLength={300}
          className="h-9 w-52 rounded-md border border-slate-300 px-2 text-xs outline-none focus:border-teal-700"
          placeholder="Operasyon gerekçesi"
        />
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800 disabled:cursor-wait disabled:opacity-60"
      >
        <RotateCcw size={14} aria-hidden="true" />
        {pending
          ? "Kuyruklanıyor"
          : status === "DEAD"
            ? "Yeniden kuyruğa al"
            : "Şimdi dene"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`max-w-52 text-right text-xs ${state.ok ? "text-teal-800" : "text-red-700"}`}
        >
          {state.message}
        </p>
      ) : null}
      <p className="max-w-52 text-right text-[11px] leading-4 text-slate-400">
        Teslim modeli nedeniyle mükerrer bildirim oluşabilir.
      </p>
    </form>
  );
}
