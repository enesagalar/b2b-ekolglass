import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminOrderFilters = {
  query?: string;
  status?: string;
  page: number;
  pageSize: number;
};

export async function getAdminOrders(filters: AdminOrderFilters) {
  const where: Prisma.OrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.query) {
    where.OR = [
      { orderNumber: { contains: filters.query } },
      { company: { displayName: { contains: filters.query } } },
      { company: { legalName: { contains: filters.query } } },
      { createdBy: { name: { contains: filters.query } } },
      { createdBy: { email: { contains: filters.query } } },
    ];
  }

  const [orders, total, submitted, preparing, readyToShip] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        currency: true,
        subtotal: true,
        shipmentMethod: true,
        deliveryCity: true,
        submittedAt: true,
        createdAt: true,
        company: { select: { id: true, displayName: true, legalName: true } },
        createdBy: { select: { name: true, email: true } },
        shipment: {
          select: { status: true, carrier: true, trackingNumber: true },
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.count({
      where: { status: { in: ["SUBMITTED", "WAITING_FOR_APPROVAL"] } },
    }),
    prisma.order.count({
      where: { status: { in: ["CONFIRMED", "PREPARING", "IN_PRODUCTION"] } },
    }),
    prisma.order.count({ where: { status: "READY_FOR_SHIPMENT" } }),
  ]);

  return { orders, total, submitted, preparing, readyToShip };
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
      submittedAt: true,
      pricedAt: true,
      createdAt: true,
      updatedAt: true,
      version: true,
      heldFromStatus: true,
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
