import {
  adminQuoteArchiveScopes,
  getAdminQuoteArchiveStatuses,
  type AdminQuoteArchiveScope,
} from "@/domain/admin-quote-archive";
import { quoteStatuses } from "@/domain/statuses";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminQuoteFilters = {
  query?: string;
  status?: string;
  scope?: AdminQuoteArchiveScope;
  includePrices?: boolean;
  page: number;
  pageSize: number;
};

export async function getAdminQuotes(filters: AdminQuoteFilters) {
  const contextWhere: Prisma.QuoteRequestWhereInput = {};
  if (filters.query) {
    contextWhere.OR = [
      { quoteNumber: { contains: filters.query } },
      { requesterName: { contains: filters.query } },
      { requesterEmail: { contains: filters.query } },
      { company: { displayName: { contains: filters.query } } },
      { company: { legalName: { contains: filters.query } } },
      {
        convertedOrder: {
          is: { orderNumber: { contains: filters.query } },
        },
      },
    ];
  }

  const scope = adminQuoteArchiveScopes.includes(filters.scope ?? "ALL")
    ? (filters.scope ?? "ALL")
    : "ALL";
  const scopeStatuses = getAdminQuoteArchiveStatuses(scope);
  const exactStatus =
    filters.status &&
    quoteStatuses.some((status) => status === filters.status)
      ? filters.status
      : null;
  const where: Prisma.QuoteRequestWhereInput = {
    ...contextWhere,
    status: {
      in: exactStatus
        ? scopeStatuses.filter((status) => status === exactStatus)
        : [...scopeStatuses],
    },
  };

  const [total, groupedStatuses] = await Promise.all([
    prisma.quoteRequest.count({ where }),
    prisma.quoteRequest.groupBy({
      by: ["status"],
      where: contextWhere,
      _count: { _all: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(Math.max(1, filters.page), totalPages);
  const quotes = await prisma.quoteRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * filters.pageSize,
    take: filters.pageSize,
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      currency: true,
      estimatedSubtotal: filters.includePrices ?? false,
      hasUnpricedItems: true,
      requesterName: true,
      requesterEmail: true,
      submittedAt: true,
      createdAt: true,
      company: {
        select: { id: true, displayName: true, legalName: true },
      },
      convertedOrder: {
        select: { id: true, orderNumber: true, status: true },
      },
      activeOfferRevision: filters.includePrices
        ? {
            select: {
              revisionNumber: true,
              currency: true,
              subtotal: true,
            },
          }
        : false,
      _count: { select: { items: true } },
    },
  });

  const statusCounts = Object.fromEntries(
    quoteStatuses.map((status) => [status, 0]),
  ) as Record<(typeof quoteStatuses)[number], number>;
  for (const row of groupedStatuses) {
    if (row.status in statusCounts) {
      statusCounts[row.status as keyof typeof statusCounts] = row._count._all;
    }
  }
  const scopeCounts = Object.fromEntries(
    adminQuoteArchiveScopes.map((item) => [
      item,
      getAdminQuoteArchiveStatuses(item).reduce(
        (sum, status) => sum + statusCounts[status],
        0,
      ),
    ]),
  ) as Record<AdminQuoteArchiveScope, number>;

  return {
    quotes,
    total,
    page,
    pageSize: filters.pageSize,
    statusCounts,
    scopeCounts,
  };
}

export function getAdminQuoteDetail(quoteId: string) {
  return prisma.quoteRequest.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      version: true,
      currency: true,
      estimatedSubtotal: true,
      hasUnpricedItems: true,
      requesterName: true,
      requesterEmail: true,
      requesterPhone: true,
      customerType: true,
      desiredDeliveryDate: true,
      notes: true,
      internalNotes: true,
      submittedAt: true,
      pricedAt: true,
      createdAt: true,
      updatedAt: true,
      company: {
        select: {
          id: true,
          displayName: true,
          legalName: true,
          email: true,
          phone: true,
          addresses: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            select: {
              id: true,
              label: true,
              line1: true,
              district: true,
              city: true,
              isDefault: true,
            },
          },
        },
      },
      convertedOrder: { select: { id: true, orderNumber: true, status: true } },
      requester: { select: { id: true, name: true, email: true } },
      activeOfferRevision: {
        select: {
          id: true,
          revisionNumber: true,
          currency: true,
          subtotal: true,
          createdAt: true,
          items: {
            select: {
              quoteRequestItemId: true,
              quantitySnapshot: true,
              unitPrice: true,
              lineTotal: true,
            },
          },
        },
      },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          customTitle: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          priceListId: true,
          priceMinQuantity: true,
          priceScope: true,
          dimensions: true,
          glassType: true,
          notes: true,
          product: { select: { id: true, code: true, name: true } },
        },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          changedBy: { select: { name: true, email: true } },
        },
      },
    },
  });
}
