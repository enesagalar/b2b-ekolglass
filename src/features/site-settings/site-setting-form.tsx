"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import { type SiteSettingActionState, updateSiteSetting } from "./actions";

const initialState: SiteSettingActionState = { ok: false, message: "" };

export function SiteSettingForm({
  setting,
}: {
  setting: {
    key: string;
    label: string;
    value: string;
    updatedAt: string;
  };
}) {
  const [state, action, pending] = useActionState(updateSiteSetting, initialState);

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-busy={pending}>
      <input type="hidden" name="key" value={setting.key} />
      <input type="hidden" name="expectedUpdatedAt" value={setting.updatedAt} />
      <label htmlFor={setting.key} className="text-sm font-semibold text-slate-900">
        {setting.label}
      </label>
      <textarea
        id={setting.key}
        name="value"
        rows={setting.key.endsWith("subtitle") ? 4 : 2}
        defaultValue={setting.value}
        className="mt-3 w-full resize-none rounded-md border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-teal-700"
      />
      <button
        disabled={pending}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        <Save size={16} aria-hidden="true" />
        {pending ? "Kaydediliyor" : "Kaydet"}
      </button>
      {state.message ? (
        <p role="status" className={`mt-3 text-xs font-semibold ${state.ok ? "text-teal-800" : "text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
