import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getAdminSalesReport } from "@/data/admin-reports";
import { prisma } from "@/lib/prisma";

const suffix = randomUUID();
const currency = `REPORT-${suffix}`;
const otherCurrency = `OTHER-${suffix}`;
const period = {
  from: new Date("2026-05-31T21:00:00.000Z"),
  toExclusive: new Date("2026-06-03T21:00:00.000Z"),
  currency,
};
const companyIds = {
  alpha: `admin-report-alpha-${suffix}`,
  zulu: `admin-report-zulu-${suffix}`,
};
const orderIds = {
  heldForReview: `admin-report-held-review-${suffix}`,
  heldAfterApproval: `admin-report-held-approved-${suffix}`,
  submitted: `admin-report-submitted-${suffix}`,
  cancelledCohort: `admin-report-cancelled-cohort-${suffix}`,
  cancelledInPeriod: `admin-report-cancelled-event-${suffix}`,
  deliveredInPeriod: `admin-report-delivered-${suffix}`,
  shipmentNotDelivered: `admin-report-shipment-not-delivered-${suffix}`,
  orderNotDelivered: `admin-report-order-not-delivered-${suffix}`,
  deliveredOutsidePeriod: `admin-report-delivered-outside-${suffix}`,
  otherCurrencySubmitted: `admin-report-other-submitted-${suffix}`,
  otherCurrencyCancelled: `admin-report-other-cancelled-${suffix}`,
  otherCurrencyDelivered: `admin-report-other-delivered-${suffix}`,
};
const allOrderIds = Object.values(orderIds);

function orderNumber(label: string) {
  return `REPORT-${label}-${suffix}`;
}

describe("getAdminSalesReport", () => {
  beforeAll(async () => {
    await prisma.company.createMany({
      data: [
        {
          id: companyIds.alpha,
          legalName: "Alpha Glass Legal",
          displayName: "Alpha Glass",
          email: `admin-report-alpha-${suffix}@example.com`,
          phone: "1",
          city: "Istanbul",
          status: "APPROVED",
        },
        {
          id: companyIds.zulu,
          legalName: "Zulu Glass Legal",
          displayName: "Zulu Glass",
          email: `admin-report-zulu-${suffix}@example.com`,
          phone: "2",
          city: "Istanbul",
          status: "APPROVED",
        },
      ],
    });

    await prisma.order.createMany({
      data: [
        {
          id: orderIds.heldForReview,
          orderNumber: orderNumber("HELD-REVIEW"),
          companyId: companyIds.zulu,
          status: "ON_HOLD",
          heldFromStatus: "WAITING_FOR_APPROVAL",
          commercialReviewRequired: true,
          currency,
          subtotal: 100,
          submittedAt: new Date("2026-06-01T08:00:00.000Z"),
        },
        {
          id: orderIds.heldAfterApproval,
          orderNumber: orderNumber("HELD-APPROVED"),
          companyId: companyIds.zulu,
          status: "ON_HOLD",
          heldFromStatus: "CONFIRMED",
          commercialReviewRequired: true,
          currency,
          subtotal: 0,
          submittedAt: new Date("2026-06-01T12:00:00.000Z"),
        },
        {
          id: orderIds.submitted,
          orderNumber: orderNumber("SUBMITTED"),
          companyId: companyIds.alpha,
          status: "SUBMITTED",
          commercialReviewRequired: true,
          currency,
          subtotal: 100,
          submittedAt: new Date("2026-06-03T08:00:00.000Z"),
        },
        {
          id: orderIds.cancelledCohort,
          orderNumber: orderNumber("CANCELLED-COHORT"),
          companyId: companyIds.alpha,
          status: "CANCELLED",
          currency,
          subtotal: 30,
          submittedAt: new Date("2026-06-02T12:00:00.000Z"),
        },
        {
          id: orderIds.cancelledInPeriod,
          orderNumber: orderNumber("CANCELLED-EVENT"),
          companyId: companyIds.alpha,
          status: "CANCELLED",
          currency,
          subtotal: 40,
          submittedAt: new Date("2026-05-20T08:00:00.000Z"),
        },
        {
          id: orderIds.deliveredInPeriod,
          orderNumber: orderNumber("DELIVERED"),
          companyId: companyIds.alpha,
          status: "DELIVERED",
          currency,
          subtotal: 70,
          submittedAt: new Date("2026-05-20T08:00:00.000Z"),
        },
        {
          id: orderIds.shipmentNotDelivered,
          orderNumber: orderNumber("SHIPMENT-SHIPPED"),
          companyId: companyIds.alpha,
          status: "DELIVERED",
          currency,
          subtotal: 80,
          submittedAt: new Date("2026-05-20T08:00:00.000Z"),
        },
        {
          id: orderIds.orderNotDelivered,
          orderNumber: orderNumber("ORDER-SHIPPED"),
          companyId: companyIds.alpha,
          status: "SHIPPED",
          currency,
          subtotal: 90,
          submittedAt: new Date("2026-05-20T08:00:00.000Z"),
        },
        {
          id: orderIds.deliveredOutsidePeriod,
          orderNumber: orderNumber("DELIVERED-OUTSIDE"),
          companyId: companyIds.alpha,
          status: "DELIVERED",
          currency,
          subtotal: 110,
          submittedAt: new Date("2026-05-20T08:00:00.000Z"),
        },
        {
          id: orderIds.otherCurrencySubmitted,
          orderNumber: orderNumber("OTHER-SUBMITTED"),
          companyId: companyIds.alpha,
          status: "SUBMITTED",
          commercialReviewRequired: true,
          currency: otherCurrency,
          subtotal: 9999,
          submittedAt: new Date("2026-06-01T08:00:00.000Z"),
        },
        {
          id: orderIds.otherCurrencyCancelled,
          orderNumber: orderNumber("OTHER-CANCELLED"),
          companyId: companyIds.alpha,
          status: "CANCELLED",
          currency: otherCurrency,
          subtotal: 9999,
          submittedAt: new Date("2026-05-20T08:00:00.000Z"),
        },
        {
          id: orderIds.otherCurrencyDelivered,
          orderNumber: orderNumber("OTHER-DELIVERED"),
          companyId: companyIds.alpha,
          status: "DELIVERED",
          currency: otherCurrency,
          subtotal: 9999,
          submittedAt: new Date("2026-05-20T08:00:00.000Z"),
        },
      ],
    });

    await prisma.orderStatusHistory.createMany({
      data: [
        {
          orderId: orderIds.cancelledCohort,
          fromStatus: "CONFIRMED",
          toStatus: "CANCELLED",
          createdAt: new Date("2026-05-20T09:00:00.000Z"),
        },
        {
          orderId: orderIds.cancelledInPeriod,
          fromStatus: "CONFIRMED",
          toStatus: "CANCELLED",
          createdAt: new Date("2026-06-02T09:00:00.000Z"),
        },
        {
          orderId: orderIds.otherCurrencyCancelled,
          fromStatus: "CONFIRMED",
          toStatus: "CANCELLED",
          createdAt: new Date("2026-06-02T09:00:00.000Z"),
        },
      ],
    });

    await prisma.shipment.createMany({
      data: [
        {
          orderId: orderIds.deliveredInPeriod,
          status: "DELIVERED",
          deliveredAt: new Date("2026-06-02T10:00:00.000Z"),
        },
        {
          orderId: orderIds.shipmentNotDelivered,
          status: "SHIPPED",
          deliveredAt: new Date("2026-06-02T10:00:00.000Z"),
        },
        {
          orderId: orderIds.orderNotDelivered,
          status: "DELIVERED",
          deliveredAt: new Date("2026-06-02T10:00:00.000Z"),
        },
        {
          orderId: orderIds.deliveredOutsidePeriod,
          status: "DELIVERED",
          deliveredAt: new Date("2026-05-20T10:00:00.000Z"),
        },
        {
          orderId: orderIds.otherCurrencyDelivered,
          status: "DELIVERED",
          deliveredAt: new Date("2026-06-02T10:00:00.000Z"),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: allOrderIds } } });
    await prisma.company.deleteMany({
      where: { id: { in: Object.values(companyIds) } },
    });
  });

  it("uses a currency-scoped submitted cohort and excludes cancelled orders from submitted metrics", async () => {
    const report = await getAdminSalesReport(period);

    expect(report.metrics.submittedCount).toBe(3);
    expect(report.metrics.submittedValue.toString()).toBe("200");
    expect(Object.fromEntries(report.statuses.map(({ status, count }) => [status, count]))).toEqual({
      ON_HOLD: 2,
      CANCELLED: 1,
      SUBMITTED: 1,
    });
    expect(report.currencies).toEqual(expect.arrayContaining([currency, otherCurrency]));
  });

  it("measures cancellations by history time and deliveries by both delivered states plus deliveredAt", async () => {
    const report = await getAdminSalesReport(period);

    expect(report.metrics.cancelledCount).toBe(1);
    expect(report.metrics.cancelledValue.toString()).toBe("40");
    expect(report.metrics.deliveredCount).toBe(1);
    expect(report.metrics.deliveredValue.toString()).toBe("70");
  });

  it("fills empty days, preserves ON_HOLD review semantics, and sorts tied companies deterministically", async () => {
    const report = await getAdminSalesReport(period);

    expect(report.metrics.commercialReviewCount).toBe(2);
    expect(
      report.daily.map((day) => ({
        date: day.date,
        count: day.count,
        value: day.value.toString(),
      })),
    ).toEqual([
      { date: "2026-06-01", count: 2, value: "100" },
      { date: "2026-06-02", count: 0, value: "0" },
      { date: "2026-06-03", count: 1, value: "100" },
    ]);
    expect(
      report.companies.map(({ companyName, count, value }) => ({
        companyName,
        count,
        value: value.toString(),
      })),
    ).toEqual([
      { companyName: "Zulu Glass", count: 2, value: "100" },
      { companyName: "Alpha Glass", count: 1, value: "100" },
    ]);
  });
});
