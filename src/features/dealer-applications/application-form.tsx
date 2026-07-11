"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";

import {
  createDealerApplication,
  type DealerApplicationState,
} from "@/features/dealer-applications/actions";

const initialState: DealerApplicationState = {
  ok: false,
  message: "",
};

const customerTypes = [
  "Oto cam bayisi",
  "Otomotiv servisi",
  "Karavan üreticisi",
  "Otobüs / minibüs işletmesi",
  "Marine / yat müşterisi",
  "Endüstriyel B2B müşteri",
];

const inputClass =
  "h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-700";

export function DealerApplicationForm() {
  const [state, formAction, pending] = useActionState(createDealerApplication, initialState);

  if (state.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-white p-7 shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><CheckCircle2 size={25} aria-hidden="true" /></span>
        <h2 className="mt-5 text-2xl font-semibold text-slate-950">Başvurunuz alındı</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">EkolGlass satış ekibi firma bilgilerinizi inceleyecek. Onaylandığında aktivasyon bağlantısı e-posta adresinize gönderilecek.</p>
        <div className="mt-5 rounded-md bg-slate-100 px-4 py-3"><p className="text-xs font-semibold uppercase text-slate-500">Başvuru referansı</p><p className="mt-1 font-mono text-base font-semibold text-slate-950">{state.reference}</p></div>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-md bg-teal-800 px-4 text-sm font-semibold text-white">Ana sayfaya dön</Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-2">
        <label htmlFor="companyName" className="text-sm font-medium text-slate-800">
          Firma unvanı
        </label>
        <input id="companyName" name="companyName" required className={inputClass} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="contactName" className="text-sm font-medium text-slate-800">
            Yetkili kişi
          </label>
          <input id="contactName" name="contactName" required className={inputClass} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="customerType" className="text-sm font-medium text-slate-800">
            Müşteri tipi
          </label>
          <select id="customerType" name="customerType" required className={inputClass}>
            {customerTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-800">
            E-posta
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="phone" className="text-sm font-medium text-slate-800">
            Telefon
          </label>
          <input id="phone" name="phone" required className={inputClass} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="city" className="text-sm font-medium text-slate-800">
            Şehir
          </label>
          <input id="city" name="city" required className={inputClass} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="taxNumber" className="text-sm font-medium text-slate-800">
            Vergi numarası
          </label>
          <input id="taxNumber" name="taxNumber" className={inputClass} />
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm font-medium text-slate-800">
          Talep notu
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          className="resize-none rounded-md border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-teal-700"
        />
      </div>
      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-teal-800" : "text-sm font-medium text-red-700"}>
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={17} aria-hidden="true" />
        {pending ? "Gönderiliyor" : "Başvuruyu gönder"}
      </button>
    </form>
  );
}
