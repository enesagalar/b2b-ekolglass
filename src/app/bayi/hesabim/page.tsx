import { Building2, MapPin, UsersRound } from "lucide-react";

import { requireDealerContext } from "@/data/dealer-context";
import { getDealerAccountData } from "@/data/dealer-portal";
import { formatPortalDate, formatPortalMoney } from "@/features/dealer/dealer-ui";

export const dynamic = "force-dynamic";

const panelClass = "min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm";

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-2 break-words text-sm font-semibold text-slate-950">{value || "Tanımlanmamış"}</dd>
    </div>
  );
}

export default async function DealerAccountPage() {
  const { company: contextCompany } = await requireDealerContext("/bayi/hesabim");
  const company = await getDealerAccountData(contextCompany.id);

  return (
    <div className="grid min-w-0 gap-6">
      <section className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-teal-800">Firma hesabı</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">{company.displayName}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Ticari koşullar ve firma bilgileri EkolGlass yönetimi tarafından merkezi olarak yönetilir.
        </p>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={panelClass}>
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <Building2 size={19} className="text-teal-800" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-950">Firma ve iletişim bilgileri</h3>
          </div>
          <dl className="grid gap-6 p-5 sm:grid-cols-2">
            <Detail label="Ticari unvan" value={company.legalName} />
            <Detail label="Vergi bilgisi" value={[company.taxOffice, company.taxNumber].filter(Boolean).join(" / ")} />
            <Detail label="E-posta" value={company.email} />
            <Detail label="Telefon" value={company.phone} />
            <Detail label="Şehir / ülke" value={`${company.city} / ${company.country}`} />
            <Detail label="Müşteri grubu" value={company.customerGroup?.name} />
          </dl>
        </div>

        <div className={panelClass}>
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">Ticari koşullar</h3>
          </div>
          <dl className="grid gap-6 p-5">
            <Detail label="Ödeme koşulu" value={company.paymentTerms} />
            <Detail label="Kredi limiti" value={company.creditLimit ? formatPortalMoney(company.creditLimit) : null} />
            <Detail label="Fiyat grubu kodu" value={company.customerGroup?.code} />
          </dl>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className={panelClass}>
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <MapPin size={19} className="text-teal-800" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-950">Kayıtlı adresler</h3>
          </div>
          <div className="divide-y divide-slate-200">
            {company.addresses.length ? (
              company.addresses.map((address) => (
                <div key={address.id} className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{address.label}</p>
                    {address.isDefault ? <span className="rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">Varsayılan</span> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {[address.line1, address.line2, address.district, address.city, address.postalCode, address.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">Kayıtlı teslimat adresi bulunmuyor.</p>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <UsersRound size={19} className="text-teal-800" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-950">Aktif kullanıcılar</h3>
          </div>
          <div className="divide-y divide-slate-200">
            {company.users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-slate-700">{user.role === "DEALER_OWNER" ? "Firma sahibi" : "Bayi personeli"}</p>
                  <p className="mt-1 text-xs text-slate-500">Son giriş: {formatPortalDate(user.lastLoginAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
