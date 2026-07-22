"use client";

import { ImageUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function HeroMediaUpload({
  defaultAltText,
  expectedUpdatedAt,
}: {
  defaultAltText: string;
  expectedUpdatedAt: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/admin/media/homepage-hero", { method: "POST", body: new FormData(event.currentTarget) });
    const body = await response.json().catch(() => ({ message: "Sunucu cevabi okunamadi." }));
    setPending(false);
    setMessage({ ok: response.ok, text: response.ok ? "Banner görseli yüklendi." : body.message ?? "Görsel yüklenemedi." });
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid content-center gap-4 p-5">
      <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
      <div><p className="text-sm font-semibold text-[#00639a]">Ana banner görseli</p><h3 className="mt-1 text-xl font-semibold text-slate-950">Bilgisayardan görsel seç</h3></div>
      <label className="grid gap-2 text-sm font-semibold text-slate-800">Görsel dosyası<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="block w-full rounded-lg border border-slate-300 p-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf4fa] file:px-3 file:py-2 file:font-semibold file:text-[#00639a]" /></label>
      <p className="text-xs leading-5 text-slate-500">JPEG, PNG veya WebP. En fazla 5 MB. Geniş yatay görsel önerilir.</p>
      <label className="grid gap-2 text-sm font-semibold text-slate-800">Alternatif metin<input name="altText" defaultValue={defaultAltText} required minLength={5} maxLength={180} className="h-12 rounded-lg border border-slate-300 px-3 text-sm font-normal outline-none focus:border-[#00639a]" /></label>
      <button disabled={pending} className="inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-[#00639a] px-4 text-sm font-semibold text-white hover:bg-[#004f7c] disabled:opacity-60">{pending ? <LoaderCircle size={16} className="animate-spin" /> : <ImageUp size={16} />} {pending ? "Yükleniyor" : "Görseli yükle"}</button>
      {message ? <p className={`rounded-md border px-3 py-2 text-sm ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{message.text}</p> : null}
    </form>
  );
}
