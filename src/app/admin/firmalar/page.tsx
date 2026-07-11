import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Filter, Search, UserRoundCheck, UsersRound } from "lucide-react";

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

function buildPageHref(currentParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(currentParams);
  params.set("page", String(page));
  return `/admin/firmalar?${params.toString()}`;
}

function statusClass(status: string) {
  if (status === "APPROVED" || status === "ACTIVE") return "bg-teal-50 text-teal-800 ring-teal-100";
  if (status === "SUSPENDED") return "bg-amber-50 text-amber-800 ring-amber-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default async function CompaniesAdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissionUser("company.manage", "/admin/firmalar");
  const params = await searchParams;
  const query = getSearchParam(params, "q")?.trim() ?? "";
  const status = getSearchParam(params, "status")?.trim() ?? "";
  const customerGroupId = getSearchParam(params, "customerGroupId")?.trim() ?? "";
  const requestedPage = Number.parseInt(getSearchParam(params, "page") ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const where: Prisma.CompanyWhereInput = {};
  if (status) where.status = status;
  if (customerGroupId) where.customerGroupId = customerGroupId;
  if (query) {
    where.OR = [
      { legalName: { contains: query } },
      { displayName: { contains: query } },
      { email: { contains: query } },
      { phone: { contains: query } },
      { city: { contains: query } },
      { taxNumber: { contains: query } },
    ];
  }

  const [companies, total, approvedCount, activeUserCount, invitedUserCount, customerGroups] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        customerGroup: true,
        users: { select: { id: true, status: true } },
        _count: { select: { orders: true, quoteRequests: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.company.count({ where }),
    prisma.company.count({ where: { status: "APPROVED" } }),
    prisma.user.count({
      where: {
        companyId: { not: null },
        role: { in: ["DEALER_OWNER", "DEALER_STAFF"] },
        status: "ACTIVE",
      },
    }),
    prisma.user.count({
      where: {
        companyId: { not: null },
        role: { in: ["DEALER_OWNER", "DEALER_STAFF"] },
        status: "INVITED",
      },
    }),
    prisma.customerGroup.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentParams = new URLSearchParams();
  if (query) currentParams.set("q", query);
  if (status) currentParams.set("status", status);
  if (customerGroupId) currentParams.set("customerGroupId", customerGroupId);

  const metrics = [
    { label: "Onaylı firma", value: approvedCount, icon: CheckCircle2, tone: "bg-teal-50 text-teal-800" },
    { label: "Aktif bayi kullanıcısı", value: activeUserCount, icon: UserRoundCheck, tone: "bg-blue-50 text-blue-800" },
    { label: "Aktivasyon bekleyen", value: invitedUserCount, icon: UsersRound, tone: "bg-amber-50 text-amber-800" },
    { label: "Filtre sonucu", value: total, icon: Building2, tone: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="grid min-w-0 gap-6">
      <section className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-teal-800">Müşteri yönetimi</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">Firmalar ve bayi hesapları</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Onaylı firmaları, müşteri gruplarını, ticari koşulları ve kullanıcı aktivasyonlarını tek merkezden yönetin.
        </p>
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

      <section className={`${panelClass} min-w-0 overflow-hidden`}>
        <form className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_180px_220px_auto]">
          <label className="relative">
            <span className="sr-only">Firmalarda ara</span>
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} aria-hidden="true" />
            <input
              name="q"
              defaultValue={query}
              className={`${inputClass} pl-10`}
              placeholder="Firma, e-posta, şehir veya vergi no"
            />
          </label>
          <label>
            <span className="sr-only">Firma durumu</span>
            <select name="status" defaultValue={status} className={inputClass}>
              <option value="">Tüm durumlar</option>
              <option value="APPROVED">Onaylı</option>
              <option value="PENDING">Beklemede</option>
              <option value="SUSPENDED">Askıda</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Müşteri grubu</span>
            <select name="customerGroupId" defaultValue={customerGroupId} className={inputClass}>
              <option value="">Tüm müşteri grupları</option>
              {customerGroups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Filter size={16} aria-hidden="true" /> Filtrele
          </button>
        </form>

        {companies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Firma</th>
                  <th className="px-5 py-3">Müşteri grubu</th>
                  <th className="px-5 py-3">Kullanıcılar</th>
                  <th className="px-5 py-3">Operasyon</th>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {companies.map((company) => {
                  const activeUsers = company.users.filter((user) => user.status === "ACTIVE").length;
                  const invitedUsers = company.users.filter((user) => user.status === "INVITED").length;
                  return (
                    <tr key={company.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="max-w-[280px] truncate text-sm font-semibold text-slate-950">{company.displayName}</p>
                        <p className="mt-1 text-xs text-slate-500">{company.city} · {company.email}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{company.customerGroup?.name ?? "Atanmadı"}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        <span className="font-semibold">{activeUsers} aktif</span>
                        {invitedUsers > 0 ? <span className="ml-2 text-amber-700">{invitedUsers} bekliyor</span> : null}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {company._count.quoteRequests} teklif · {company._count.orders} sipariş
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ring-1 ${statusClass(company.status)}`}>
                          {company.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/firmalar/${company.id}`}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:border-teal-700 hover:text-teal-800"
                        >
                          Yönet <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <Building2 className="mx-auto text-slate-300" size={34} aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">Filtreye uygun firma bulunamadı.</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-600">
          <span>Sayfa {Math.min(page, totalPages)} / {totalPages}</span>
          <div className="flex gap-2">
            <Link
              href={buildPageHref(currentParams, Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none rounded-md border border-slate-200 px-3 py-2 text-slate-300" : "rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700"}
            >Önceki</Link>
            <Link
              href={buildPageHref(currentParams, Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
              className={page >= totalPages ? "pointer-events-none rounded-md border border-slate-200 px-3 py-2 text-slate-300" : "rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700"}
            >Sonraki</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
