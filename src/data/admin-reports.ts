import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { reportDayKey } from "@/domain/reporting";
import { prisma } from "@/lib/prisma";

export type SalesReportPeriod = {
  from: Date;
  toExclusive: Date;
  currency: string;
};

const zero = () => new Prisma.Decimal(0);

export async function getAdminSalesReport(period: SalesReportPeriod) {
  const submittedWhere = {
    submittedAt: { gte: period.from, lt: period.toExclusive },
    currency: period.currency,
    status: { not: "DRAFT" },
  } satisfies Prisma.OrderWhereInput;

  const [orders, deliveredOrders, cancellationEvents, currencies] = await Promise.all([
    prisma.order.findMany({
      where: submittedWhere,
      orderBy: { submittedAt: "asc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        heldFromStatus: true,
        subtotal: true,
        submittedAt: true,
        commercialReviewRequired: true,
        companyId: true,
        company: { select: { displayName: true, legalName: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        currency: period.currency,
        status: "DELIVERED",
        shipment: {
          status: "DELIVERED",
          deliveredAt: { gte: period.from, lt: period.toExclusive },
        },
      },
      select: { id: true, subtotal: true },
    }),
    prisma.orderStatusHistory.findMany({
      where: {
        toStatus: "CANCELLED",
        createdAt: { gte: period.from, lt: period.toExclusive },
        order: { currency: period.currency },
      },
      orderBy: { createdAt: "asc" },
      select: {
        orderId: true,
        createdAt: true,
        order: { select: { subtotal: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        submittedAt: { not: null },
        status: { not: "DRAFT" },
      },
      distinct: ["currency"],
      select: { currency: true },
      orderBy: { currency: "asc" },
    }),
  ]);

  const activeOrders = orders.filter((order) => order.status !== "CANCELLED");
  const submittedValue = activeOrders.reduce(
    (sum, order) => sum.add(order.subtotal),
    zero(),
  );
  const deliveredValue = deliveredOrders.reduce(
    (sum, order) => sum.add(order.subtotal),
    zero(),
  );
  const cancellationByOrder = new Map(
    cancellationEvents.map((event) => [event.orderId, event]),
  );
  const cancellations = [...cancellationByOrder.values()];
  const cancelledValue = cancellations.reduce(
    (sum, event) => sum.add(event.order.subtotal),
    zero(),
  );

  const statusMap = new Map<string, { count: number; value: Prisma.Decimal }>();
  const companyMap = new Map<string, {
    companyId: string;
    companyName: string;
    count: number;
    value: Prisma.Decimal;
  }>();
  const dayMap = new Map<string, { count: number; value: Prisma.Decimal }>();

  for (let cursor = period.from.getTime(); cursor < period.toExclusive.getTime(); cursor += 86_400_000) {
    dayMap.set(reportDayKey(new Date(cursor)), { count: 0, value: zero() });
  }

  for (const order of orders) {
    const status = statusMap.get(order.status) ?? { count: 0, value: zero() };
    status.count += 1;
    status.value = status.value.add(order.subtotal);
    statusMap.set(order.status, status);

    if (order.status === "CANCELLED") continue;
    const company = companyMap.get(order.companyId) ?? {
      companyId: order.companyId,
      companyName: order.company.displayName || order.company.legalName,
      count: 0,
      value: zero(),
    };
    company.count += 1;
    company.value = company.value.add(order.subtotal);
    companyMap.set(order.companyId, company);

    if (order.submittedAt) {
      const key = reportDayKey(order.submittedAt);
      const day = dayMap.get(key) ?? { count: 0, value: zero() };
      day.count += 1;
      day.value = day.value.add(order.subtotal);
      dayMap.set(key, day);
    }
  }

  return {
    metrics: {
      submittedCount: activeOrders.length,
      submittedValue,
      deliveredCount: deliveredOrders.length,
      deliveredValue,
      cancelledCount: cancellations.length,
      cancelledValue,
      averageOrderValue: activeOrders.length
        ? submittedValue.div(activeOrders.length)
        : zero(),
      commercialReviewCount: activeOrders.filter(
        (order) =>
          order.commercialReviewRequired &&
          (["SUBMITTED", "WAITING_FOR_APPROVAL"].includes(order.status) ||
            (order.status === "ON_HOLD" &&
              order.heldFromStatus !== null &&
              ["SUBMITTED", "WAITING_FOR_APPROVAL"].includes(order.heldFromStatus))),
      ).length,
    },
    statuses: [...statusMap].map(([status, data]) => ({ status, ...data }))
      .sort((a, b) => b.count - a.count),
    companies: [...companyMap.values()]
      .sort((a, b) =>
        b.value.comparedTo(a.value) ||
        b.count - a.count ||
        a.companyId.localeCompare(b.companyId),
      )
      .slice(0, 10),
    daily: [...dayMap].map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    currencies: [...new Set([period.currency, ...currencies.map((item) => item.currency)])].sort(),
  };
}
