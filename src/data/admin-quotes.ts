import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminQuoteFilters = {
  query?: string;
  status?: string;
  page: number;
  pageSize: number;
};

export async function getAdminQuotes(filters: AdminQuoteFilters) {
  const where: Prisma.QuoteRequestWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.query) {
    where.OR = [
      { quoteNumber: { contains: filters.query } },
      { requesterName: { contains: filters.query } },
      { requesterEmail: { contains: filters.query } },
      { company: { displayName: { contains: filters.query } } },
      { company: { legalName: { contains: filters.query } } },
    ];
  }

  const [quotes, total, newCount, waitingCount, readyCount] =
    await Promise.all([
      prisma.quoteRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          currency: true,
          estimatedSubtotal: true,
          hasUnpricedItems: true,
          requesterName: true,
          requesterEmail: true,
          submittedAt: true,
          createdAt: true,
          company: {
            select: { id: true, displayName: true, legalName: true },
          },
          activeOfferRevision: {
            select: { revisionNumber: true, currency: true, subtotal: true },
          },
          _count: { select: { items: true } },
        },
      }),
      prisma.quoteRequest.count({ where }),
      prisma.quoteRequest.count({ where: { status: "NEW" } }),
      prisma.quoteRequest.count({
        where: { status: "WAITING_FOR_CUSTOMER_INFO" },
      }),
      prisma.quoteRequest.count({
        where: { status: { in: ["PRICED", "OFFER_SENT"] } },
      }),
    ]);

  return { quotes, total, newCount, waitingCount, readyCount };
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
        },
      },
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
