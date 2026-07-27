"use client";

import { Save } from "lucide-react";
import { useActionState, useState } from "react";

import { type SiteSettingActionState, updateSiteSetting } from "./actions";

const initialState: SiteSettingActionState = { ok: false, message: "" };

export function SiteSettingForm({
  setting,
  description,
}: {
  setting: {
    key: string;
    label: string;
    value: string;
    updatedAt: string;
  };
  description: string;
}) {
  const [state, action, pending] = useActionState(updateSiteSetting, initialState);
  const [value, setValue] = useState(setting.value);
  const maxLength = setting.key.endsWith(".title")
    ? 120
    : setting.key.endsWith(".subtitle")
      ? 500
      : 40;

  return (
    <form action={action} className="grid gap-3 border-b border-slate-200 p-5 last:border-b-0" aria-busy={pending}>
      <input type="hidden" name="key" value={setting.key} />
      <input type="hidden" name="expectedUpdatedAt" value={setting.updatedAt} />
      <div>
        <label htmlFor={setting.key} className="text-sm font-semibold text-slate-900">
          {setting.label}
        </label>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <textarea
        id={setting.key}
        name="value"
        rows={setting.key.endsWith("subtitle") ? 4 : 2}
        value={value}
        required
        maxLength={maxLength}
        onChange={(event) => setValue(event.target.value)}
        className="w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-[#00639a] focus:ring-2 focus:ring-[#d9edf7]"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">{value.length} / {maxLength} karakter</p>
        <button
          disabled={pending || value.trim().length === 0 || value === setting.value}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00639a] px-4 text-sm font-semibold text-white transition hover:bg-[#004f7c] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Save size={16} aria-hidden="true" />
          {pending ? "Kaydediliyor" : "Bu alanı kaydet"}
        </button>
      </div>
      {state.message ? (
        <p role="status" className={`text-xs font-semibold ${state.ok ? "text-[#00639a]" : "text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
