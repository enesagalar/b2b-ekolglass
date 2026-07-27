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
    <form
      action={action}
      className="grid justify-items-start gap-2 xl:justify-items-end"
      aria-busy={pending}
      onSubmit={(event) => {
        if (!window.confirm(status === "DEAD" ? "Bu teslimat yeniden kuyruğa alınsın mı?" : "Bu teslimat şimdi yeniden denensin mi?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="expectedStatus" value={status} />
      <input type="hidden" name="expectedAttempts" value={attempts} />
      <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
      {status === "DEAD" ? (
        <label className="grid gap-1 text-left text-[11px] font-semibold text-slate-600 xl:text-right">
          Yeniden deneme gerekçesi
          <input
            name="reason"
            required
            minLength={10}
            maxLength={300}
            className="h-9 w-64 max-w-full rounded-md border border-slate-300 px-2 text-xs outline-none focus:border-teal-700"
            placeholder="Sorunun nasıl giderildiğini yazın"
          />
        </label>
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
            ? "Teslimatı yeniden dene"
            : "Şimdi yeniden dene"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`max-w-64 text-left text-xs xl:text-right ${state.ok ? "text-teal-800" : "text-red-700"}`}
        >
          {state.message}
        </p>
      ) : null}
      <p className="max-w-64 text-left text-[11px] leading-4 text-slate-500 xl:text-right">
        İşlem audit geçmişine yazılır. Sağlayıcı teslimatı daha önce aldıysa aynı bildirim tekrar ulaşabilir.
      </p>
    </form>
  );
}
