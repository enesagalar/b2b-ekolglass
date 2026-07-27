import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CircleCheckBig,
  Clock3,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import type { DealerApplicationStatus } from "@/domain/dealer-application-workflow";
import { getRoleLabel } from "@/domain/roles";
import { getStatusLabel } from "@/domain/statuses";
import { DealerApplicationReviewForm } from "@/features/dealer-applications/application-review-form";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";
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

function getAuditActionLabel(action: string) {
  const labels: Record<string, string> = {
    "dealer_application.approve": "Başvuru onaylandı",
    "dealer_application.review": "Başvuru kararı güncellendi",
    "user.activation.invitation.created": "Aktivasyon bağlantısı oluşturuldu",
    "company.discount.updated": "Ticari koşullar güncellendi",
  };

  return labels[action] ?? "İlişkili kayıt güncellendi";
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
  const currentStatus = application.status as DealerApplicationStatus;
  const reviewSummary: Record<
    DealerApplicationStatus,
    { eyebrow: string; title: string; description: string }
  > = {
    NEW: {
      eyebrow: "İlk işlem bekleniyor",
      title: "Başvuruyu incelemeye alın",
      description: "Firma bilgilerini kontrol edin; henüz firma veya kullanıcı hesabı oluşturulmadı.",
    },
    IN_REVIEW: {
      eyebrow: "İnceleme sürüyor",
      title: "Kararı ve ticari koşulları netleştirin",
      description: "Onaydan önce müşteri grubu, vade ve kredi politikasını kontrol edin.",
    },
    NEEDS_INFO: {
      eyebrow: "Bilgi bekleniyor",
      title: "Eksik bilgi tamamlandığında incelemeyi yeniden açın",
      description: "Sistem otomatik e-posta göndermez; iletişim takibi ekip tarafından yürütülür.",
    },
    REJECTED: {
      eyebrow: "Başvuru kapalı",
      title: "Gerekirse yeniden incelemeye alın",
      description: "Firma ve kullanıcı hesabı oluşturulmadı. Başvuru doğrudan onaylanmadan önce yeniden incelenmelidir.",
    },
    APPROVED: {
      eyebrow: "Başvuru tamamlandı",
      title: "Firma hesabı oluşturuldu",
      description: "Sonraki işlem, firma detayından bayi sahibinin aktivasyonunu tamamlamaktır.",
    },
  };
  const summary = reviewSummary[currentStatus];

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

      <section className="grid gap-4 border-y border-slate-200 bg-white px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800">
            {currentStatus === "APPROVED" ? (
              <CircleCheckBig size={20} aria-hidden="true" />
            ) : (
              <Clock3 size={20} aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-teal-800">{summary.eyebrow}</p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">{summary.title}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{summary.description}</p>
          </div>
        </div>
        <a
          href={currentStatus === "APPROVED" && application.company ? "#firma-hesabi" : "#inceleme-karari"}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {currentStatus === "APPROVED" ? "Firma hesabına geç" : "Karar alanına git"}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
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
            <section id="firma-hesabi" className={`${panelClass} scroll-mt-28`}>
              <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                <UserRound size={19} className="text-teal-800" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-950">Firma ve kullanıcı hesabı</h3>
              </div>
              <dl className="grid gap-x-6 px-5 py-2 md:grid-cols-2">
                <InfoRow label="Firma durumu" value={getStatusLabel(application.company.status)} />
                <InfoRow label="Müşteri grubu" value={application.company.customerGroup?.name} />
                <InfoRow label="Vade (ödeme süresi)" value={application.company.paymentTerms} />
                <InfoRow label="Kredi limiti" value={application.company.creditLimit?.toString()} />
              </dl>
              <div className="border-t border-slate-200">
                {application.company.users.map((companyUser) => (
                  <div key={companyUser.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{companyUser.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{companyUser.email} · {getRoleLabel(companyUser.role)}</p>
                    </div>
                    <span className={companyUser.status === "ACTIVE" ? "rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800" : "rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"}>
                      {getStatusLabel(companyUser.status)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

        </div>

        <aside id="inceleme-karari" className="scroll-mt-28 xl:row-span-2 xl:sticky xl:top-28 xl:self-start">
          <section className={panelClass}>
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase text-teal-800">İnceleme kararı</p>
              <h3 className="mt-1 text-base font-semibold text-slate-950">
                {currentStatus === "APPROVED" ? "Başvuru tamamlandı" : "Güvenli sonraki işlem"}
              </h3>
            </div>
            {currentStatus === "APPROVED" && application.company ? (
              <div className="grid gap-4 p-5">
                <div className="flex items-start gap-3 rounded-md border border-teal-200 bg-teal-50 p-4 text-teal-900">
                  <BadgeCheck size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold">Firma ve bayi sahibi hesabı hazır</p>
                    <p className="mt-1 text-xs leading-5">
                      Bu başvuru için tekrar karar verilemez. Kullanıcı aktivasyonu ve ticari koşul değişiklikleri firma hesabından yönetilir.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/admin/firmalar/${application.company.id}#firma-kullanicilari`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Firma hesabını yönet
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <DealerApplicationReviewForm
                applicationId={application.id}
                expectedUpdatedAt={application.updatedAt.toISOString()}
                currentStatus={currentStatus}
                customerGroups={customerGroups}
                defaultCustomerGroupId={defaultGroupId ?? ""}
                defaultPaymentTerms={application.company?.paymentTerms ?? ""}
                defaultCreditLimit={application.company?.creditLimit?.toString() ?? ""}
                defaultInternalNotes={application.internalNotes ?? ""}
              />
            )}
            <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
              <CalendarClock size={15} aria-hidden="true" />
              Son inceleme: {formatDate(application.reviewedAt)}
            </div>
          </section>
        </aside>

        <section className={`${panelClass} xl:col-start-1`}>
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <ShieldCheck size={19} className="text-teal-800" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-950">İşlem geçmişi</h3>
          </div>
          {auditLogs.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{getAuditActionLabel(log.action)}</p>
                    <p className="mt-1 text-xs text-slate-500">{log.actor?.name ?? "Sistem"}</p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-500">{formatDate(log.createdAt)}</time>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-slate-500">Henüz işlem kaydı yok.</p>
          )}
        </section>
      </div>
    </div>
  );
}
