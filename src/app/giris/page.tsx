import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Headphones, PackageSearch } from "lucide-react";

import { isAdminRole, isDealerRole, isKnownRole } from "@/domain/roles";
import { LoginForm } from "@/features/auth/login-form";
import { AuthHeader } from "@/features/auth/auth-header";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Bayi Girişi",
  description: "EkolGlass bayi hesabınıza giriş yapın.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (user && isKnownRole(user.role)) {
    if (isDealerRole(user.role)) redirect("/");
    if (isAdminRole(user.role)) redirect("/");
  }

  const resolved = await searchParams;
  const nextValue = Array.isArray(resolved.next) ? resolved.next[0] : resolved.next;
  const activated = (Array.isArray(resolved.activated) ? resolved.activated[0] : resolved.activated) === "1";

  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      <AuthHeader action={{ href: "/bayi-basvurusu", label: "Bayi Başvurusu" }} />

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-[1fr_0.82fr] md:px-8">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-[#00639a]">EkolGlass B2B satış portalı</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-[#1d1d1f] md:text-5xl">Bayi hesabınıza giriş yapın</h1>
          <p className="mt-5 text-base leading-7 text-[#68686d]">
            Firma fiyatlarını görüntüleyin, sipariş oluşturun ve sevkiyatlarınızı tek yerden takip edin.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 border-t border-slate-300 pt-4">
              <PackageSearch size={20} className="mt-0.5 shrink-0 text-[#00639a]" aria-hidden="true" />
              <div><p className="text-sm font-semibold text-slate-950">Firma fiyatları</p><p className="mt-1 text-xs leading-5 text-slate-500">Fiyat grubunuza ve firmanıza özel ürün görünümü.</p></div>
            </div>
            <div className="flex items-start gap-3 border-t border-slate-300 pt-4">
              <Headphones size={20} className="mt-0.5 shrink-0 text-[#00639a]" aria-hidden="true" />
              <div><p className="text-sm font-semibold text-slate-950">Satış desteği</p><p className="mt-1 text-xs leading-5 text-slate-500">Teklif ve sipariş süreçlerinizi aynı hesapta izleyin.</p></div>
            </div>
          </div>
        </div>

        <div>
          {activated ? (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div><p className="text-sm font-semibold">Hesabınız aktifleştirildi</p><p className="mt-1 text-xs leading-5">E-posta adresiniz ve belirlediğiniz parola ile giriş yapabilirsiniz.</p></div>
            </div>
          ) : null}
          <LoginForm nextPath={nextValue ?? "/"} />
          <div className="mt-5 grid gap-2 text-sm text-slate-600">
            <p>Henüz bayi hesabınız yok mu? <Link href="/bayi-basvurusu" className="font-semibold text-[#00639a]">Başvuru yapın</Link></p>
            <p className="text-xs text-slate-500">Onaylandıysanız e-postanıza gönderilen aktivasyon bağlantısını kullanın.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
