import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";

import { DealerApplicationForm } from "@/features/dealer-applications/application-form";

export default function DealerApplicationPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="font-semibold text-slate-950">
            EkolGlass B2B
          </Link>
          <Link href="/urunler" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">
            Ürünler
          </Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div>
          <p className="inline-flex rounded-md bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
            Bayi ve kurumsal müşteri başvurusu
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 md:text-5xl">
            EkolGlass satış ekibi başvurunuzu operasyonel kriterlere göre inceler.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-600">
            Başvuru sonrası firma tipi, ürün ihtiyacı, şehir, vergi bilgisi ve satın alma hacmi değerlendirilir.
            Onaylanan müşteriler bayi portalında fiyat, teklif ve sipariş akışlarına erişir.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              "Müşteri grubu ve fiyat listesi atanır",
              "Bayi sahibi ve personel rolleri ayrılır",
              "Teklif ve sipariş geçmişi firma bazında tutulur",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
                <CheckCircle2 size={20} className="text-teal-700" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-slate-800">
            <Building2 size={18} className="text-teal-800" aria-hidden="true" />
            Firma bilgileri
          </div>
          <DealerApplicationForm />
        </div>
      </section>
    </main>
  );
}
