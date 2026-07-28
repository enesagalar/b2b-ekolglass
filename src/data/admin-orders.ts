import {
  adminOrderQueueScopes,
  getAdminOrderQueueStatuses,
  type AdminOrderQueueScope,
} from "@/domain/admin-order-queue";
import { orderStatuses } from "@/domain/statuses";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminOrderFilters = {
  query?: string;
  status?: string;
  scope?: AdminOrderQueueScope;
  manualCityOnly?: boolean;
  page: number;
  pageSize: number;
};

export async function getAdminOrders(filters: AdminOrderFilters) {
  const contextWhere: Prisma.OrderWhereInput = {
    status: { in: orderStatuses.filter((status) => status !== "DRAFT") },
  };

  if (filters.manualCityOnly) {
    contextWhere.shipment = {
      is: {
        carrier: "CITY_LOJISTIK",
        status: "AWAITING_MANUAL_DISPATCH",
      },
    };
  }

  if (filters.query) {
    contextWhere.OR = [
      { orderNumber: { contains: filters.query } },
      { company: { displayName: { contains: filters.query } } },
      { company: { legalName: { contains: filters.query } } },
      { createdBy: { name: { contains: filters.query } } },
      { createdBy: { email: { contains: filters.query } } },
      { shipment: { is: { trackingNumber: { contains: filters.query } } } },
    ];
  }

  const where: Prisma.OrderWhereInput = { ...contextWhere };
  const exactStatus =
    filters.status &&
    orderStatuses.some(
      (status) => status !== "DRAFT" && status === filters.status,
    )
      ? filters.status
      : null;
  const scope = adminOrderQueueScopes.includes(filters.scope ?? "ALL")
    ? (filters.scope ?? "ALL")
    : "ALL";
  const scopeStatuses = getAdminOrderQueueStatuses(scope);
  where.status = {
    in: exactStatus
      ? scopeStatuses.filter((status) => status === exactStatus)
      : [...scopeStatuses],
  };

  const [total, groupedStatuses] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      where: contextWhere,
      _count: { _all: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(Math.max(1, filters.page), totalPages);
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * filters.pageSize,
    take: filters.pageSize,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
      subtotal: true,
      shipmentMethod: true,
      deliveryCity: true,
      requestedDeliveryDate: true,
      submittedAt: true,
      createdAt: true,
      updatedAt: true,
      company: { select: { id: true, displayName: true, legalName: true } },
      createdBy: { select: { name: true, email: true } },
      shipment: {
        select: { status: true, carrier: true, trackingNumber: true },
      },
      _count: { select: { items: true } },
    },
  });

  const statusCounts = Object.fromEntries(
    orderStatuses
      .filter((status) => status !== "DRAFT")
      .map((status) => [status, 0]),
  ) as Record<Exclude<(typeof orderStatuses)[number], "DRAFT">, number>;
  for (const row of groupedStatuses) {
    if (row.status in statusCounts) {
      statusCounts[row.status as keyof typeof statusCounts] = row._count._all;
    }
  }
  const queueCounts = Object.fromEntries(
    adminOrderQueueScopes.map((item) => [
      item,
      getAdminOrderQueueStatuses(item).reduce(
        (sum, status) =>
          sum + (statusCounts[status as keyof typeof statusCounts] ?? 0),
        0,
      ),
    ]),
  ) as Record<AdminOrderQueueScope, number>;

  return {
    orders,
    total,
    page,
    pageSize: filters.pageSize,
    statusCounts,
    queueCounts,
    submitted:
      statusCounts.SUBMITTED + statusCounts.WAITING_FOR_APPROVAL,
    preparing:
      statusCounts.CONFIRMED +
      statusCounts.PREPARING +
      statusCounts.IN_PRODUCTION,
    readyToShip: statusCounts.READY_FOR_SHIPMENT,
  };
}

export function getAdminOrderDetail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
      subtotal: true,
      paymentTermsSnapshot: true,
      creditPolicySnapshot: true,
      creditLimitSnapshot: true,
      creditExposureBefore: true,
      creditExposureAfter: true,
      commercialReviewRequired: true,
      commercialOverrideReason: true,
      commercialOverrideAt: true,
      commercialOverrideBy: { select: { name: true, email: true } },
      shipmentMethod: true,
      notes: true,
      internalNotes: true,
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
      version: true,
      heldFromStatus: true,
      sourceQuote: { select: { id: true, quoteNumber: true } },
      company: {
        select: {
          id: true,
          displayName: true,
          legalName: true,
          email: true,
          phone: true,
        },
      },
      createdBy: { select: { name: true, email: true } },
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
          priceScope: true,
          notes: true,
          reservations: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              quantity: true,
              status: true,
              expiresAt: true,
              releasedAt: true,
              consumedAt: true,
              stockItem: {
                select: {
                  warehouseCode: true,
                  quantity: true,
                  reservedQuantity: true,
                },
              },
            },
          },
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
