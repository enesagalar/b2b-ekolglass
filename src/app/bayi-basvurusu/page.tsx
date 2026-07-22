import { Building2, CheckCircle2 } from "lucide-react";

import { AuthHeader } from "@/features/auth/auth-header";
import { DealerApplicationForm } from "@/features/dealer-applications/application-form";

export default function DealerApplicationPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      <AuthHeader action={{ href: "/urunler", label: "Ürünler" }} />
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div>
          <p className="text-sm font-semibold text-[#00639a]">
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
              "Sipariş ve sevkiyat geçmişi firma bazında tutulur",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 border-t border-[#d9dadd] py-4">
                <CheckCircle2 size={20} className="text-[#00639a]" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-slate-800">
            <Building2 size={18} className="text-[#00639a]" aria-hidden="true" />
            Firma bilgileri
          </div>
          <DealerApplicationForm />
        </div>
      </section>
    </main>
  );
}
