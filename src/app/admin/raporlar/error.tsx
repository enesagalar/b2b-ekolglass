"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminReportsError({ reset }: { reset: () => void }) {
  return (
    <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm" role="alert">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-700">
        <AlertTriangle size={20} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">Rapor hazırlanamadı</h2>
      <p className="mt-2 text-sm text-slate-600">Filtreleriniz korunuyor. Veri sorgusunu yeniden çalıştırabilirsiniz.</p>
      <button type="button" onClick={reset} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">
        <RotateCcw size={16} /> Tekrar dene
      </button>
    </section>
  );
}
