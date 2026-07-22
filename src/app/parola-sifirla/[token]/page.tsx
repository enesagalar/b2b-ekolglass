import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { AuthHeader } from "@/features/auth/auth-header";
import { PasswordResetForm } from "@/features/auth/password-reset-form";
import { hashPasswordResetToken } from "@/lib/password-reset-token";
import { prisma } from "@/lib/prisma";

export const metadata = { referrer: "no-referrer" as const, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PasswordResetPage({ params }: PageProps<"/parola-sifirla/[token]">) {
  const { token } = await params;
  const record = await prisma.userPasswordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(token) },
    include: { user: { include: { company: { select: { displayName: true, status: true } } } } },
  });
  const valid = Boolean(record && !record.consumedAt && !record.revokedAt && record.expiresAt > new Date() && record.user.status === "ACTIVE" && record.user.company?.status === "APPROVED");

  return <main className="min-h-screen bg-[#f5f5f7]">
    <AuthHeader action={{ href: "/giris", label: "Bayi girişi" }} />
    <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-12 lg:min-h-[calc(100vh-88px)] lg:grid-cols-2 lg:py-16">
      <div><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e8f4fa] text-[#00639a]"><ShieldCheck size={24} /></span><h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">Bayi hesabınızın parolasını yenileyin.</h1><p className="mt-4 text-sm leading-6 text-slate-600">Bu tek kullanımlık bağlantı iki saat geçerlidir. İşlem tamamlandığında açık oturumlar güvenlik için kapatılır.</p></div>
      {valid && record ? <div><p className="mb-4 text-sm font-semibold text-slate-700">{record.user.company?.displayName} · {record.user.email}</p><PasswordResetForm token={token} /></div> : <div className="surface-panel border-red-200 p-6"><h2 className="text-xl font-semibold">Bağlantı kullanılamıyor</h2><p className="mt-3 text-sm leading-6 text-slate-600">Bağlantı geçersiz, kullanılmış veya süresi dolmuş olabilir.</p><Link href="/giris" className="mt-5 inline-flex text-sm font-semibold text-[#00639a]">Giriş ekranına dön</Link></div>}
    </section>
  </main>;
}
