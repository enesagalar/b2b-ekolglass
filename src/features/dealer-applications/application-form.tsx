"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";

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
