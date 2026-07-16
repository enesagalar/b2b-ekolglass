"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function StockExportButton({
  href,
  disabledReason,
}: {
  href: string;
  disabledReason?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function download() {
    setState("loading");
    setMessage("CSV hazırlanıyor.");
    try {
      const response = await fetch(href, { credentials: "same-origin" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message ?? "CSV oluşturulamadı.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? "ekolglass-stok.csv";
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setState("success");
      setMessage("CSV indirildi.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "CSV oluşturulamadı.");
    }
  }

  return (
    <div className="grid justify-items-stretch gap-1 sm:justify-items-end">
      <button
        type="button"
        onClick={download}
        disabled={Boolean(disabledReason) || state === "loading"}
        title={disabledReason}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {state === "loading" ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
        {state === "loading" ? "Hazırlanıyor" : "CSV indir"}
      </button>
      <span className={`min-h-4 text-xs ${state === "error" ? "text-red-700" : "text-slate-500"}`} aria-live="polite">
        {disabledReason ?? message}
      </span>
    </div>
  );
}
