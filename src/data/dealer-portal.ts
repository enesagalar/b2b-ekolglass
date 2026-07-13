import "server-only";

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

export function getDealerOrders(companyId: string) {
  return prisma.order.findMany({
    where: buildDealerOwnershipWhere(companyId),
    orderBy: { createdAt: "desc" },
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
      submittedAt: true,
      pricedAt: true,
      createdAt: true,
      updatedAt: true,
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
