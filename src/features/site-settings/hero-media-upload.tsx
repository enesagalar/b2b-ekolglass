"use client";

import { ImageUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export function HeroMediaUpload({
  defaultAltText,
  expectedUpdatedAt,
}: {
  defaultAltText: string;
  expectedUpdatedAt: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectFile(file: File | null) {
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/media/homepage-hero", { method: "POST", body: new FormData(form) });
      const body = await response.json().catch(() => ({ message: "Sunucu cevabı okunamadı." }));
      setMessage({ ok: response.ok, text: response.ok ? "Banner görseli yüklendi." : body.message ?? "Görsel yüklenemedi." });
      if (response.ok) {
        form.reset();
        selectFile(null);
        router.refresh();
      }
    } catch {
      setMessage({
        ok: false,
        text: "Görsel sunucuya gönderilemedi. Bağlantınızı kontrol edip yeniden deneyin.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid content-center gap-4 p-5">
      <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
      <div><p className="text-sm font-semibold text-[#00639a]">2. adım</p><h3 className="mt-1 text-xl font-semibold text-slate-950">Banner görselini değiştir</h3></div>
      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        Bilgisayardan görsel seç
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          className="block w-full rounded-lg border border-slate-300 p-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf4fa] file:px-3 file:py-2 file:font-semibold file:text-[#00639a]"
        />
      </label>
      <p className="text-xs leading-5 text-slate-500">
        JPEG, PNG veya WebP; en fazla 5 MB. Masaüstü ve mobil kırpma için geniş yatay, merkezde güvenli boşluk bulunan görsel kullanın.
      </p>
      {selectedFile ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          Seçilen dosya: {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} MB
        </p>
      ) : null}
      {previewUrl ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          <div
            className="aspect-[16/9] w-full bg-cover bg-center"
            style={{ backgroundImage: `url("${previewUrl}")` }}
            role="img"
            aria-label="Seçilen banner görseli önizlemesi"
          />
          <p className="px-3 py-2 text-xs text-slate-500">Yüklemeden önce merkez kırpma önizlemesi</p>
        </div>
      ) : null}
      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        Görsel açıklaması
        <input name="altText" defaultValue={defaultAltText} required minLength={5} maxLength={180} className="h-12 rounded-lg border border-slate-300 px-3 text-sm font-normal outline-none focus:border-[#00639a]" />
        <span className="text-xs font-normal leading-5 text-slate-500">Görsel yüklenmezse ve ekran okuyucularda bu açıklama kullanılır.</span>
      </label>
      <button disabled={pending || !selectedFile} className="inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-[#00639a] px-4 text-sm font-semibold text-white hover:bg-[#004f7c] disabled:cursor-not-allowed disabled:bg-slate-300">{pending ? <LoaderCircle size={16} className="animate-spin" /> : <ImageUp size={16} />} {pending ? "Yükleniyor" : "Görseli yayınla"}</button>
      {message ? <p className={`rounded-md border px-3 py-2 text-sm ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{message.text}</p> : null}
    </form>
  );
}
