import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Clock3, Filter, Search, UserRoundCheck, UsersRound } from "lucide-react";

import { ListPagination } from "@/components/list-pagination";
import { dealerApplicationStatuses, getStatusLabel } from "@/domain/statuses";
import { Prisma } from "@/generated/prisma/client";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const pageSize = 25;
const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";
const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSearchParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
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

function buildPageHref(currentParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(currentParams);
  params.set("page", String(page));
  return `/admin/bayi-basvurulari?${params.toString()}`;
}

export default async function DealerApplicationsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissionUser("dealer.application.review", "/admin/bayi-basvurulari");
  const params = await searchParams;
  const query = getSearchParam(params, "q")?.trim() ?? "";
  const requestedStatus = getSearchParam(params, "status") ?? "";
  const status = dealerApplicationStatuses.includes(requestedStatus as (typeof dealerApplicationStatuses)[number])
    ? requestedStatus
    : "";
  const requestedPage = Number.parseInt(getSearchParam(params, "page") ?? "1", 10);
  const normalizedPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const where: Prisma.DealerApplicationWhereInput = {};
  if (status) where.status = status;
  if (query) {
    where.OR = [
      { companyName: { contains: query } },
      { contactName: { contains: query } },
      { email: { contains: query } },
      { phone: { contains: query } },
      { city: { contains: query } },
      { taxNumber: { contains: query } },
    ];
  }

  const [total, newCount, reviewCount, approvedCount] = await Promise.all([
    prisma.dealerApplication.count({ where }),
    prisma.dealerApplication.count({ where: { status: "NEW" } }),
    prisma.dealerApplication.count({ where: { status: { in: ["IN_REVIEW", "NEEDS_INFO"] } } }),
    prisma.dealerApplication.count({ where: { status: "APPROVED" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(normalizedPage, totalPages);
  const applications = await prisma.dealerApplication.findMany({
    where,
    include: { company: { select: { id: true, displayName: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const currentParams = new URLSearchParams();
  if (query) currentParams.set("q", query);
  if (status) currentParams.set("status", status);

  const metrics = [
    { label: "Yeni başvuru", value: newCount, icon: Clock3, tone: "bg-amber-50 text-amber-800" },
    { label: "İnceleme kuyruğu", value: reviewCount, icon: UserRoundCheck, tone: "bg-blue-50 text-blue-800" },
    { label: "Onaylı bayi", value: approvedCount, icon: CheckCircle2, tone: "bg-teal-50 text-teal-800" },
    { label: "Filtre sonucu", value: total, icon: UsersRound, tone: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="grid gap-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-800">Satış operasyonu</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Bayi başvuruları</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Başvuruları inceleyin, ticari koşulları belirleyin ve onaydan firma hesabı üretin.
          </p>
        </div>
        <Link
          href="/bayi-basvurusu"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Public formu aç
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className={`${panelClass} p-4`}>
              <div className="flex items-center justify-between gap-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-md ${metric.tone}`}>
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span className="text-2xl font-semibold text-slate-950">{metric.value}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">{metric.label}</p>
            </article>
          );
        })}
      </section>

      <section className={panelClass}>
        <form aria-label="Bayi başvurularını filtrele" className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative">
            <span className="sr-only">Başvurularda ara</span>
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} aria-hidden="true" />
            <input
              name="q"
              defaultValue={query}
              className={`${inputClass} pl-10`}
              placeholder="Firma, yetkili, e-posta, şehir veya vergi no"
            />
          </label>
          <label>
            <span className="sr-only">Durum filtresi</span>
            <select name="status" defaultValue={status} className={inputClass}>
              <option value="">Tüm durumlar</option>
              {dealerApplicationStatuses.map((item) => (
                <option key={item} value={item}>{getStatusLabel(item)}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Filter size={16} aria-hidden="true" />
            Filtrele
          </button>
        </form>

        {applications.length > 0 ? (
          <>
          <div className="divide-y divide-slate-200 lg:hidden">
            {applications.map((application) => {
              const nextAction = {
                NEW: "İlk inceleme bekliyor",
                IN_REVIEW: "İnceleme devam ediyor",
                NEEDS_INFO: "Başvuru sahibinden bilgi bekleniyor",
                APPROVED: application.company ? "Firma hesabı oluşturuldu" : "Onay kaydı kontrol edilmeli",
                REJECTED: "Başvuru kapatıldı",
              }[application.status] ?? "Başvuru durumunu inceleyin";
              return (
                <article key={application.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold text-slate-950">{application.companyName}</h3>
                      <p className="mt-1 break-all text-xs leading-5 text-slate-500">{application.email}</p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ring-1 ${statusClass(application.status)}`}>
                      {getStatusLabel(application.status)}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-800">{nextAction}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div><dt className="text-xs text-slate-500">Yetkili</dt><dd className="mt-1 font-medium text-slate-800">{application.contactName}</dd></div>
                    <div><dt className="text-xs text-slate-500">Telefon</dt><dd className="mt-1 font-medium text-slate-800">{application.phone}</dd></div>
                    <div><dt className="text-xs text-slate-500">Konum</dt><dd className="mt-1 font-medium text-slate-800">{application.city}</dd></div>
                    <div><dt className="text-xs text-slate-500">Müşteri tipi</dt><dd className="mt-1 font-medium text-slate-800">{application.customerType}</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-slate-500">Başvuru zamanı</dt><dd className="mt-1 font-medium text-slate-800">{formatDate(application.createdAt)}</dd></div>
                  </dl>
                  <Link
                    href={`/admin/bayi-basvurulari/${application.id}`}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
                  >
                    Başvuruyu incele <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Firma</th>
                  <th className="px-5 py-3">Yetkili</th>
                  <th className="px-5 py-3">Konum / tip</th>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3">Başvuru</th>
                  <th className="px-5 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.map((application) => (
                  <tr key={application.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                          <Building2 size={17} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[260px] truncate text-sm font-semibold text-slate-950">{application.companyName}</p>
                          <p className="mt-0.5 max-w-[260px] truncate text-xs text-slate-500">{application.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      <p className="font-semibold">{application.contactName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{application.phone}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      <p>{application.city}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{application.customerType}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ring-1 ${statusClass(application.status)}`}>
                        {getStatusLabel(application.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{formatDate(application.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/bayi-basvurulari/${application.id}`}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
                      >
                        İncele
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="px-5 py-14 text-center">
            <UsersRound className="mx-auto text-slate-300" size={34} aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">Filtreye uygun başvuru bulunamadı.</p>
          </div>
        )}

        <ListPagination
          page={page}
          totalPages={totalPages}
          previousHref={buildPageHref(currentParams, Math.max(1, page - 1))}
          nextHref={buildPageHref(currentParams, Math.min(totalPages, page + 1))}
          ariaLabel="Bayi başvurusu listesi sayfaları"
        />
      </section>
    </div>
  );
}
