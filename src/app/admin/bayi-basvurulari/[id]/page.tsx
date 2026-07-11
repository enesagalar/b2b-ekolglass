import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  CreditCard,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { dealerApplicationStatuses, getStatusLabel } from "@/domain/statuses";
import { reviewDealerApplicationForm } from "@/features/dealer-applications/admin-actions";
import { DealerApplicationAdminForm } from "@/features/dealer-applications/admin-action-form";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";
const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700";
const textareaClass =
  "min-h-28 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-700";
const labelClass = "grid gap-1.5 text-xs font-semibold text-slate-700";

function formatDate(value: Date | null) {
  if (!value) return "Henüz yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function statusClass(status: string) {
  if (status === "APPROVED") return "bg-teal-50 text-teal-800 ring-teal-100";
  if (status === "REJECTED") return "bg-red-50 text-red-700 ring-red-100";
  if (status === "NEEDS_INFO") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (status === "IN_REVIEW") return "bg-blue-50 text-blue-800 ring-blue-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 md:grid-cols-[150px_1fr] md:gap-4">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-800">{value || "-"}</dd>
    </div>
  );
}

export default async function DealerApplicationDetailPage({ params }: PageProps<"/admin/bayi-basvurulari/[id]">) {
  const { id } = await params;
  await requirePermissionUser("dealer.application.review", `/admin/bayi-basvurulari/${id}`);
  const [application, customerGroups] = await Promise.all([
    prisma.dealerApplication.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            customerGroup: true,
            users: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    }),
    prisma.customerGroup.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!application) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "DealerApplication", entityId: application.id },
        ...(application.companyId ? [{ entityType: "Company", entityId: application.companyId }] : []),
      ],
    },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const defaultGroupId = application.company?.customerGroupId ?? customerGroups.find((group) => group.code === "BAYI-STANDART")?.id;

  return (
    <div className="grid gap-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end">
        <div>
          <Link href="/admin/bayi-basvurulari" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-800">
            <ArrowLeft size={16} aria-hidden="true" />
            Başvuru listesine dön
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">{application.companyName}</h2>
            <span className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(application.status)}`}>
              {getStatusLabel(application.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">Başvuru #{application.id.slice(-8)} · {formatDate(application.createdAt)}</p>
        </div>
        {application.company ? (
          <Link
            href={`/admin/firmalar/${application.company.id}`}
            className="flex items-center gap-3 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-teal-900 transition hover:bg-teal-100"
          >
            <BadgeCheck size={20} aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase">Firma hesabı</p>
              <p className="text-sm font-semibold">{application.company.displayName}</p>
            </div>
          </Link>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="grid content-start gap-6">
          <section className={panelClass}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <Building2 size={19} className="text-teal-800" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-950">Başvuru bilgileri</h3>
            </div>
            <dl className="px-5 py-2">
              <InfoRow label="Firma" value={application.companyName} />
              <InfoRow label="Yetkili" value={application.contactName} />
              <InfoRow label="E-posta" value={application.email} />
              <InfoRow label="Telefon" value={application.phone} />
              <InfoRow label="Şehir" value={application.city} />
              <InfoRow label="Vergi no" value={application.taxNumber} />
              <InfoRow label="Müşteri tipi" value={application.customerType} />
              <InfoRow label="Talep notu" value={application.message} />
            </dl>
          </section>

          {application.company ? (
            <section className={panelClass}>
              <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                <UserRound size={19} className="text-teal-800" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-950">Firma ve kullanıcı hesabı</h3>
              </div>
              <dl className="grid gap-x-6 px-5 py-2 md:grid-cols-2">
                <InfoRow label="Firma durumu" value={application.company.status} />
                <InfoRow label="Müşteri grubu" value={application.company.customerGroup?.name} />
                <InfoRow label="Ödeme koşulu" value={application.company.paymentTerms} />
                <InfoRow label="Kredi limiti" value={application.company.creditLimit?.toString()} />
              </dl>
              <div className="border-t border-slate-200">
                {application.company.users.map((companyUser) => (
                  <div key={companyUser.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{companyUser.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{companyUser.email} · {companyUser.role}</p>
                    </div>
                    <span className={companyUser.status === "ACTIVE" ? "rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800" : "rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"}>
                      {companyUser.status === "INVITED" ? "Aktivasyon bekliyor" : companyUser.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className={panelClass}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <ShieldCheck size={19} className="text-teal-800" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-950">İşlem geçmişi</h3>
            </div>
            {auditLogs.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                      <p className="mt-1 text-xs text-slate-500">{log.actor?.name ?? "Sistem"}</p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-500">{formatDate(log.createdAt)}</time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">Henüz audit kaydı yok.</p>
            )}
          </section>
        </div>

        <aside className="xl:sticky xl:top-28 xl:self-start">
          <section className={panelClass}>
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase text-teal-800">İnceleme kararı</p>
              <h3 className="mt-1 text-base font-semibold text-slate-950">Durum ve ticari koşullar</h3>
            </div>
            <DealerApplicationAdminForm action={reviewDealerApplicationForm} className="grid gap-4 p-5">
              <input type="hidden" name="id" value={application.id} />
              <input type="hidden" name="expectedUpdatedAt" value={application.updatedAt.toISOString()} />
              <label className={labelClass}>
                Başvuru durumu
                <select name="status" defaultValue={application.status} className={inputClass}>
                  {dealerApplicationStatuses.map((status) => (
                    <option key={status} value={status}>{getStatusLabel(status)}</option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Müşteri grubu
                <select name="customerGroupId" defaultValue={defaultGroupId ?? ""} className={inputClass}>
                  <option value="">Müşteri grubu seçin</option>
                  {customerGroups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Ödeme koşulu
                  <input name="paymentTerms" defaultValue={application.company?.paymentTerms ?? ""} className={inputClass} placeholder="30 gün vadeli" />
                </label>
                <label className={labelClass}>
                  Kredi limiti
                  <input name="creditLimit" inputMode="decimal" defaultValue={application.company?.creditLimit?.toString() ?? ""} className={inputClass} placeholder="250000" />
                </label>
              </div>

              <label className={labelClass}>
                İç inceleme notu
                <textarea name="internalNotes" defaultValue={application.internalNotes ?? ""} className={textareaClass} />
              </label>

              <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                <p className="flex items-start gap-2"><CreditCard size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> Onayda firma ticari koşulları kaydedilir.</p>
                <p className="flex items-start gap-2"><Mail size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> Bayi sahibi hesabı aktivasyon bekleyen durumda açılır.</p>
                <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> Başvuru ve firma aynı kayıt zincirinde tutulur.</p>
              </div>

              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900"
              >
                <Save size={16} aria-hidden="true" />
                Kararı kaydet
              </button>
            </DealerApplicationAdminForm>
            <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
              <CalendarClock size={15} aria-hidden="true" />
              Son inceleme: {formatDate(application.reviewedAt)}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
