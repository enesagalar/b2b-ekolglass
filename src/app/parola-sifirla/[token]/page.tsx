import Link from "next/link";
import { Factory, ShieldCheck } from "lucide-react";

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

  return <main className="min-h-screen bg-slate-100"><section className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-5 py-10 lg:grid-cols-2">
    <div><Link href="/" className="inline-flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-teal-300"><Factory size={22} /></span><span className="text-lg font-semibold text-slate-950">EkolGlass B2B</span></Link><ShieldCheck className="mt-12 text-teal-800" size={28} /><h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950">Bayi hesabınızın parolasını yenileyin.</h1><p className="mt-4 text-sm leading-6 text-slate-600">Bu tek kullanımlık bağlantı iki saat geçerlidir. İşlem tamamlandığında açık oturumlar güvenlik için kapatılır.</p></div>
    {valid && record ? <div><p className="mb-4 text-sm font-semibold text-slate-700">{record.user.company?.displayName} · {record.user.email}</p><PasswordResetForm token={token} /></div> : <div className="rounded-lg border border-red-200 bg-white p-6"><h2 className="text-xl font-semibold">Bağlantı kullanılamıyor</h2><p className="mt-3 text-sm leading-6 text-slate-600">Bağlantı geçersiz, kullanılmış veya süresi dolmuş olabilir.</p><Link href="/giris" className="mt-5 inline-flex text-sm font-semibold text-teal-800">Giriş ekranına dön</Link></div>}
  </section></main>;
}
