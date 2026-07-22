import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { isAdminRole, isKnownRole } from "@/domain/roles";
import { InternalLoginForm } from "@/features/auth/internal-login-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "EkolGlass Yönetim",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InternalLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (user && isKnownRole(user.role) && isAdminRole(user.role)) redirect("/admin");

  const resolved = await searchParams;
  const nextValue = Array.isArray(resolved.next) ? resolved.next[0] : resolved.next;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1117] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1683bd] to-transparent" />
      <section className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo compact inverse />
          <div>
            <p className="text-sm font-semibold">EkolGlass</p>
            <p className="flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck size={12} /> Yetkili yönetim erişimi</p>
          </div>
        </div>
        <h1 className="text-3xl font-semibold">Yönetim sistemine giriş</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Bu alan yalnızca yetkilendirilmiş EkolGlass ekip hesapları içindir.</p>
        <div className="mt-7"><InternalLoginForm nextPath={nextValue ?? "/admin"} /></div>
      </section>
    </main>
  );
}
