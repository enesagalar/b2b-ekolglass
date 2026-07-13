"use client";

import { LoaderCircle, Plus, Send } from "lucide-react";
import { useActionState } from "react";

import { addQuoteCartItemAction, submitQuoteCartAction } from "@/features/quotes/actions";

export function AddToQuoteCartForm({ productId, compact = false }: { productId: string; compact?: boolean }) {
  const [state, action, pending] = useActionState(addQuoteCartItemAction, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="productId" value={productId}/>
      <div className="flex gap-2">
        <label className={compact ? "sr-only" : "grid gap-1 text-xs font-semibold text-slate-700"}>{compact ? "Adet" : "Adet"}<input name="quantity" type="number" min="1" max="999" defaultValue="1" className={`${compact ? "w-16" : "w-24"} h-11 rounded-md border border-slate-300 px-3 text-sm`}/></label>
        <button disabled={pending} type="submit" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={17}/> : <Plus size={17}/>}Teklife ekle</button>
      </div>
      {state.message ? <p role="alert" className="text-xs font-medium text-rose-700">{state.message}</p> : null}
    </form>
  );
}

export function SubmitQuoteForm({ user, company, idempotencyKey }: { user: { name: string; email: string }; company: { phone: string }; idempotencyKey: string }) {
  const [state, action, pending] = useActionState(submitQuoteCartAction, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey}/>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-semibold text-slate-700">Yetkili adı<input required name="requesterName" defaultValue={user.name} className="h-11 rounded-md border border-slate-300 px-3 text-sm font-normal"/></label><label className="grid gap-1.5 text-xs font-semibold text-slate-700">E-posta<input required type="email" name="requesterEmail" defaultValue={user.email} className="h-11 rounded-md border border-slate-300 px-3 text-sm font-normal"/></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-semibold text-slate-700">Telefon<input name="requesterPhone" defaultValue={company.phone} className="h-11 rounded-md border border-slate-300 px-3 text-sm font-normal"/></label><label className="grid gap-1.5 text-xs font-semibold text-slate-700">İstenen teslim tarihi<input type="date" name="desiredDeliveryDate" className="h-11 rounded-md border border-slate-300 px-3 text-sm font-normal"/></label></div>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Talep notu<textarea name="notes" rows={4} maxLength={1000} className="rounded-md border border-slate-300 p-3 text-sm font-normal" placeholder="Proje, teslimat veya uygulama detayları"/></label>
      {state.message ? <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">{state.message}</p> : null}
      <button disabled={pending} type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={18}/> : <Send size={18}/>}Teklif talebini gönder</button>
    </form>
  );
}
