import Link from "next/link";
import { Factory, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div>
          <Link href="/" className="mb-8 inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-800 ring-1 ring-teal-100">
              <Factory size={22} aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold text-slate-950">EkolGlass B2B</span>
          </Link>
          <p className="inline-flex rounded-md bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
            Güvenli B2B ve yönetim girişi
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950">
            Bayiler ve EkolGlass ekipleri için tek güvenli giriş noktası.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600">
            Giriş sonrasında kullanıcı rolüne göre bayi kataloğu veya yönetim paneli açılır. Firma fiyatları ve
            operasyon verileri yalnızca yetkili hesaplara gösterilir.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              "Oturum cookie'si httpOnly olarak tutulur",
              "Parolalar güçlü hash ile saklanır",
              "Firma ve yönetim erişimleri rol bazlı korunur",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
                <ShieldCheck size={19} className="text-teal-700" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <LoginForm />
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Yönetim hesapları admin paneline, bayi hesapları firma kataloğuna yönlendirilir.
          </p>
        </div>
      </section>
    </main>
  );
}
