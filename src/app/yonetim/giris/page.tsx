import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white">
      <section className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-400 text-slate-950"><ShieldCheck size={22} aria-hidden="true" /></span>
          <div>
            <p className="text-sm font-semibold">EkolGlass</p>
            <p className="text-xs text-slate-400">Yetkili yönetim erişimi</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold">Yönetim sistemine giriş</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Bu alan yalnızca yetkilendirilmiş EkolGlass ekip hesapları içindir.</p>
        <div className="mt-7"><InternalLoginForm nextPath={nextValue ?? "/admin"} /></div>
      </section>
    </main>
  );
}
