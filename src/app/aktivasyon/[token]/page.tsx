import Link from "next/link";
import { Clock3, Factory, ShieldCheck } from "lucide-react";

import { AccountActivationForm } from "@/features/auth/activation-form";
import { hashActivationToken } from "@/lib/activation-token";
import { prisma } from "@/lib/prisma";

export const metadata = {
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountActivationPage({ params }: PageProps<"/aktivasyon/[token]">) {
  const { token } = await params;
  const tokenHash = hashActivationToken(token);
  const invitation = await prisma.userActivationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: { company: { select: { displayName: true } } },
      },
    },
  });
  const isValid = Boolean(
    invitation &&
      !invitation.consumedAt &&
      !invitation.revokedAt &&
      invitation.expiresAt > new Date() &&
      invitation.user.status === "INVITED",
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-teal-300">
              <Factory size={22} aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold text-slate-950">EkolGlass B2B</span>
          </Link>
          <p className="mt-10 text-sm font-semibold text-teal-800">Güvenli bayi aktivasyonu</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight text-slate-950">
            B2B hesabınız için parolanızı belirleyin.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600">
            Bu bağlantı tek kullanımlıktır. Aktivasyon tamamlandığında firma hesabınızla katalog, fiyat ve operasyon
            alanlarına giriş yapabilirsiniz.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 border-l-2 border-teal-700 py-2 pl-4">
              <ShieldCheck size={19} className="mt-0.5 shrink-0 text-teal-800" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-700">Parolanız güçlü hash ile saklanır.</p>
            </div>
            <div className="flex items-start gap-3 border-l-2 border-amber-500 py-2 pl-4">
              <Clock3 size={19} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-700">Bağlantı 48 saat sonunda geçersiz olur.</p>
            </div>
          </div>
        </div>

        <div>
          {isValid && invitation ? (
            <div className="grid gap-4">
              <div className="border-b border-slate-300 pb-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Firma hesabı</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {invitation.user.company?.displayName ?? invitation.user.name}
                </h2>
              </div>
              <AccountActivationForm token={token} />
            </div>
          ) : (
            <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Aktivasyon bağlantısı kullanılamıyor</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Bağlantı geçersiz, daha önce kullanılmış veya süresi dolmuş olabilir. Firma yöneticinizden yeni davet
                bağlantısı isteyin.
              </p>
              <Link href="/giris" className="mt-5 inline-flex text-sm font-semibold text-teal-800">
                Giriş ekranına dön
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
