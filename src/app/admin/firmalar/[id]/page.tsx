import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CreditCard, FileText, ShieldCheck, UserRound, UsersRound } from "lucide-react";

import { getStatusLabel } from "@/domain/statuses";
import { getRoleLabel, hasPermission, isKnownRole } from "@/domain/roles";
import { ActivationInvitationForm } from "@/features/company-management/invitation-form";
import { CompanyDiscountForm } from "@/features/company-management/commercial-terms-form";
import { CompanyLifecycleForm } from "@/features/company-management/company-lifecycle-form";
import { DealerUserStatusActions, NewDealerUserForm, PasswordResetInvitationForm } from "@/features/company-management/user-management-forms";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 md:grid-cols-[145px_1fr] md:gap-4">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-800">{value || "-"}</dd>
    </div>
  );
}

function companyStatusClass(status: string) {
  if (status === "APPROVED") return "bg-teal-50 text-teal-800 ring-teal-100";
  if (status === "SUSPENDED") return "bg-amber-50 text-amber-800 ring-amber-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default async function CompanyDetailPage({ params }: PageProps<"/admin/firmalar/[id]">) {
  const { id } = await params;
  const actor = await requirePermissionUser("company.manage", `/admin/firmalar/${id}`);
  const canManageUsers = isKnownRole(actor.role) && hasPermission(actor.role, "company.user.manage");
  const canManageCredentials = isKnownRole(actor.role) && hasPermission(actor.role, "company.user.credentials.manage");
  const canManageLifecycle = isKnownRole(actor.role) && hasPermission(actor.role, "company.lifecycle.manage");

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      customerGroup: true,
      users: {
        include: { activationTokens: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      },
      dealerApplications: { orderBy: { createdAt: "desc" } },
      priceLists: { orderBy: { createdAt: "desc" } },
      _count: { select: { orders: true, quoteRequests: true } },
    },
  });

  if (!company) notFound();

  const userIds = company.users.map((user) => user.id);
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Company", entityId: company.id },
        ...(userIds.length > 0 ? [{ entityType: "User", entityId: { in: userIds } }] : []),
        ...company.dealerApplications.map((application) => ({
          entityType: "DealerApplication",
          entityId: application.id,
        })),
      ],
    },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return (
    <div className="grid gap-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end">
        <div>
          <Link
            href="/admin/firmalar"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-800"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Firma listesine dön
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">{company.displayName}</h2>
            <span className={`rounded px-2.5 py-1 text-xs font-semibold ring-1 ${companyStatusClass(company.status)}`}>
              {getStatusLabel(company.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {company.city} · {company.customerGroup?.name ?? "Müşteri grubu atanmamış"}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="rounded-md border border-slate-200 bg-white px-4 py-3"><strong>{company._count.quoteRequests}</strong> teklif</span>
          <span className="rounded-md border border-slate-200 bg-white px-4 py-3"><strong>{company._count.orders}</strong> sipariş</span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid content-start gap-6">
          <section className={panelClass}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <Building2 size={19} className="text-teal-800" aria-hidden="true" />
              <h3 className="font-semibold text-slate-950">Firma bilgileri</h3>
            </div>
            <dl className="px-5 py-2">
              <InfoRow label="Ticari unvan" value={company.legalName} />
              <InfoRow label="E-posta" value={company.email} />
              <InfoRow label="Telefon" value={company.phone} />
              <InfoRow label="Şehir" value={company.city} />
              <InfoRow label="Vergi dairesi" value={company.taxOffice} />
              <InfoRow label="Vergi no" value={company.taxNumber} />
              <InfoRow label="İç not" value={company.internalNotes} />
            </dl>
            {canManageLifecycle ? (
              <CompanyLifecycleForm
                companyId={company.id}
                status={company.status}
                updatedAt={company.updatedAt.toISOString()}
              />
            ) : null}
          </section>

          <section className={panelClass}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <CreditCard size={19} className="text-teal-800" aria-hidden="true" />
              <h3 className="font-semibold text-slate-950">Ticari koşullar</h3>
            </div>
            <dl className="px-5 py-2">
              <InfoRow label="Müşteri grubu" value={company.customerGroup?.name} />
              <InfoRow label="Vade (ödeme süresi)" value={company.paymentTerms} />
              <InfoRow
                label="Kredi limiti"
                value={
                  company.creditPolicy === "UNLIMITED"
                    ? "Limitsiz"
                    : company.creditLimit?.toString()
                }
              />
              <InfoRow label="Müşteri iskontosu" value={`%${company.discountRate.toString()}`} />
            </dl>
            <CompanyDiscountForm
              companyId={company.id}
              updatedAt={company.updatedAt.toISOString()}
              discountRate={company.discountRate.toString()}
              paymentTerms={company.paymentTerms ?? ""}
              creditPolicy={company.creditPolicy}
              creditLimit={company.creditLimit?.toString() ?? ""}
            />
            {company.priceLists.length > 0 ? (
              <div className="border-t border-slate-200 px-5 py-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Firma fiyat listeleri</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {company.priceLists.map((list) => (
                    <span key={list.id} className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {list.name} · {list.currency}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className={panelClass}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <FileText size={19} className="text-teal-800" aria-hidden="true" />
              <h3 className="font-semibold text-slate-950">Kaynak başvurular</h3>
            </div>
            {company.dealerApplications.length > 0 ? (
              company.dealerApplications.map((application) => (
                <Link
                  key={application.id}
                  href={`/admin/bayi-basvurulari/${application.id}`}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{application.contactName}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(application.createdAt)}</p>
                  </div>
                  <span className="text-xs font-semibold text-teal-800">{getStatusLabel(application.status)}</span>
                </Link>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">Bağlı başvuru yok.</p>
            )}
          </section>
        </div>

        <div className="grid content-start gap-6">
          <section className={panelClass}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <UsersRound size={19} className="text-teal-800" aria-hidden="true" />
                <h3 className="font-semibold text-slate-950">Firma kullanıcıları</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">{company.users.length} hesap</span>
            </div>
            {canManageUsers ? <NewDealerUserForm companyId={company.id} /> : null}
            {company.users.length > 0 ? (
              company.users.map((user) => {
                const latestToken = user.activationTokens[0];
                const tokenState = latestToken?.consumedAt
                  ? "Kullanıldı"
                  : latestToken?.revokedAt
                    ? "İptal edildi"
                    : latestToken && latestToken.expiresAt > new Date()
                      ? `Geçerli: ${formatDate(latestToken.expiresAt)}`
                      : latestToken
                        ? "Süresi doldu"
                        : "Davet üretilmedi";

                return (
                  <article
                    key={user.id}
                    className="grid gap-4 border-b border-slate-200 px-5 py-5 last:border-0 md:grid-cols-[1fr_auto] md:items-start"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                        <UserRound size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{user.email} · {getRoleLabel(user.role)}</p>
                        <p className="mt-2 text-xs text-slate-500">Davet: {tokenState}</p>
                      </div>
                    </div>
                    <div className="grid justify-items-start gap-3 md:justify-items-end">
                      <span className={user.status === "ACTIVE" ? "rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800" : "rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"}>
                        {getStatusLabel(user.status)}
                      </span>
                      {canManageCredentials && user.status === "INVITED" ? <ActivationInvitationForm userId={user.id} /> : null}
                      {canManageCredentials && user.status === "ACTIVE" ? <PasswordResetInvitationForm userId={user.id} /> : null}
                      {canManageUsers ? <DealerUserStatusActions companyId={company.id} userId={user.id} status={user.status} /> : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">Firma kullanıcısı yok.</p>
            )}
          </section>

          <section className={panelClass}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <ShieldCheck size={19} className="text-teal-800" aria-hidden="true" />
              <h3 className="font-semibold text-slate-950">Audit geçmişi</h3>
            </div>
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                    <p className="mt-1 text-xs text-slate-500">{log.actor?.name ?? "Sistem"}</p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-500">{formatDate(log.createdAt)}</time>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">Audit kaydı yok.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
