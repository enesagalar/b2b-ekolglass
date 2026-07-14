import "server-only";

import { orderStatuses } from "@/domain/statuses";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const openOrderStatuses = [
  "DRAFT",
  "SUBMITTED",
  "WAITING_FOR_APPROVAL",
  "CONFIRMED",
  "PREPARING",
  "IN_PRODUCTION",
  "READY_FOR_SHIPMENT",
  "SHIPPED",
  "ON_HOLD",
];

const openQuoteStatuses = [
  "NEW",
  "IN_REVIEW",
  "WAITING_FOR_CUSTOMER_INFO",
  "PRICED",
  "OFFER_SENT",
  "APPROVED",
];

export function buildDealerOwnershipWhere(companyId: string) {
  return { companyId } as const;
}

export const dealerOrderStatuses = orderStatuses.filter((status) => status !== "DRAFT");

export type DealerOrderFilters = {
  query?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
};

const defaultDealerOrderPageSize = 20;
const maxDealerOrderPageSize = 100;

function positiveInteger(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : fallback;
}

export async function getDealerDashboardData(companyId: string) {
  const ownership = buildDealerOwnershipWhere(companyId);

  const [
    openOrders,
    openQuotes,
    activeShipments,
    activeProducts,
    recentOrders,
    recentQuotes,
  ] = await Promise.all([
    prisma.order.count({
      where: { ...ownership, status: { in: openOrderStatuses } },
    }),
    prisma.quoteRequest.count({
      where: { ...ownership, status: { in: openQuoteStatuses } },
    }),
    prisma.shipment.count({
      where: {
        order: ownership,
        status: { notIn: ["DELIVERED", "CANCELLED"] },
      },
    }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.order.findMany({
      where: ownership,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        currency: true,
        subtotal: true,
        createdAt: true,
        shipment: { select: { status: true, trackingNumber: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.quoteRequest.findMany({
      where: ownership,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        desiredDeliveryDate: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    openOrders,
    openQuotes,
    activeShipments,
    activeProducts,
    recentOrders,
    recentQuotes,
  };
}

export async function getDealerOrders(
  companyId: string,
  filters: DealerOrderFilters = {},
) {
  const page = positiveInteger(filters.page, 1);
  const pageSize = Math.min(
    maxDealerOrderPageSize,
    positiveInteger(filters.pageSize, defaultDealerOrderPageSize),
  );
  const where: Prisma.OrderWhereInput = buildDealerOwnershipWhere(companyId);
  const query = filters.query?.trim();

  if (query) where.orderNumber = { contains: query };
  if (
    filters.status &&
    dealerOrderStatuses.some((status) => status === filters.status)
  ) {
    where.status = filters.status;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lt: filters.dateTo } : {}),
    };
  }

  const total = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const orders = await prisma.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (effectivePage - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
      subtotal: true,
      shipmentMethod: true,
      createdAt: true,
      updatedAt: true,
      shipment: {
        select: {
          status: true,
          carrier: true,
          trackingNumber: true,
          trackingUrl: true,
        },
      },
      _count: { select: { items: true } },
    },
  });

  return { orders, total, page: effectivePage, pageSize };
}

export function getDealerOrderDetail(companyId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, companyId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
      subtotal: true,
      shipmentMethod: true,
      notes: true,
      deliveryLabel: true,
      deliveryLine1: true,
      deliveryLine2: true,
      deliveryDistrict: true,
      deliveryCity: true,
      deliveryCountry: true,
      deliveryPostalCode: true,
      requestedDeliveryDate: true,
      submittedAt: true,
      pricedAt: true,
      createdAt: true,
      updatedAt: true,
      sourceQuote: { select: { id: true, quoteNumber: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          productCodeSnapshot: true,
          productNameSnapshot: true,
          dimensionsSnapshot: true,
          glassTypeSnapshot: true,
          notes: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      },
      shipment: {
        select: {
          status: true,
          carrier: true,
          trackingNumber: true,
          trackingUrl: true,
          shippedAt: true,
          deliveredAt: true,
          events: {
            orderBy: { occurredAt: "desc" },
            select: {
              id: true,
              title: true,
              description: true,
              location: true,
              occurredAt: true,
            },
          },
        },
      },
    },
  });
}

export function getDealerQuotes(companyId: string) {
  return prisma.quoteRequest.findMany({
    where: buildDealerOwnershipWhere(companyId),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      desiredDeliveryDate: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  });
}

export function getDealerQuoteDetail(companyId: string, quoteId: string) {
  return prisma.quoteRequest.findFirst({
    where: { id: quoteId, companyId },
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      requesterName: true,
      requesterEmail: true,
      requesterPhone: true,
      desiredDeliveryDate: true,
      notes: true,
      currency: true,
      estimatedSubtotal: true,
      hasUnpricedItems: true,
      submittedAt: true,
      pricedAt: true,
      createdAt: true,
      updatedAt: true,
      convertedOrder: { select: { id: true, orderNumber: true, status: true } },
      activeOfferRevision: {
        select: {
          revisionNumber: true,
          currency: true,
          subtotal: true,
          items: {
            select: {
              quoteRequestItemId: true,
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
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          dimensions: true,
          glassType: true,
          notes: true,
          product: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });
}

export function getDealerAccountData(companyId: string) {
  return prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: {
      id: true,
      legalName: true,
      displayName: true,
      taxOffice: true,
      taxNumber: true,
      email: true,
      phone: true,
      city: true,
      country: true,
      paymentTerms: true,
      creditLimit: true,
      customerGroup: { select: { code: true, name: true } },
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          label: true,
          line1: true,
          line2: true,
          district: true,
          city: true,
          country: true,
          postalCode: true,
          isDefault: true,
        },
      },
      users: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          lastLoginAt: true,
        },
      },
    },
  });
}
