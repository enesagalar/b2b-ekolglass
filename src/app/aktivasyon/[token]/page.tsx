import Link from "next/link";
import { Clock3, ShieldCheck } from "lucide-react";

import { AccountActivationForm } from "@/features/auth/activation-form";
import { AuthHeader } from "@/features/auth/auth-header";
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
    <main className="min-h-screen bg-[#f5f5f7]">
      <AuthHeader action={{ href: "/giris", label: "Bayi girişi" }} />
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 lg:min-h-[calc(100vh-88px)] lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16">
        <div>
          <p className="text-sm font-semibold text-[#00639a]">Güvenli bayi aktivasyonu</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            B2B hesabınız için parolanızı belirleyin.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600">
            Bu bağlantı tek kullanımlıktır. Aktivasyon tamamlandığında firma hesabınızla katalog, fiyat ve operasyon
            alanlarına giriş yapabilirsiniz.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 border-l-2 border-[#00639a] py-2 pl-4">
              <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#00639a]" aria-hidden="true" />
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
            <div className="surface-panel border-red-200 p-6">
              <h2 className="text-xl font-semibold text-slate-950">Aktivasyon bağlantısı kullanılamıyor</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Bağlantı geçersiz, daha önce kullanılmış veya süresi dolmuş olabilir. Firma yöneticinizden yeni davet
                bağlantısı isteyin.
              </p>
              <Link href="/giris" className="mt-5 inline-flex text-sm font-semibold text-[#00639a]">
                Giriş ekranına dön
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
