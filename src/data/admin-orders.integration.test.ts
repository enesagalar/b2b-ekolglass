import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAdminOrders } from "@/data/admin-orders";
import { prisma } from "@/lib/prisma";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const companyId = `admin-order-filter-company-${suffix}`;
const cityOrderId = `admin-order-filter-city-${suffix}`;
const otherOrderId = `admin-order-filter-other-${suffix}`;
const reviewOrderId = `admin-order-filter-review-${suffix}`;
const heldOrderId = `admin-order-filter-held-${suffix}`;
const deliveredOrderId = `admin-order-filter-delivered-${suffix}`;
const draftOrderId = `admin-order-filter-draft-${suffix}`;
const orderIds = [
  cityOrderId,
  otherOrderId,
  reviewOrderId,
  heldOrderId,
  deliveredOrderId,
  draftOrderId,
];

describe("admin order filters with SQLite", () => {
  beforeAll(async () => {
    await prisma.company.create({
      data: {
        id: companyId,
        legalName: "City Filter Test Ltd.",
        displayName: `City Filter Test ${suffix}`,
        email: `city-filter-${suffix}@example.com`,
        phone: "+90 212 000 00 00",
        city: "Istanbul",
        status: "APPROVED",
      },
    });
    await prisma.order.createMany({
      data: [
        {
          id: cityOrderId,
          orderNumber: `CITY-FILTER-${suffix}`,
          companyId,
          status: "READY_FOR_SHIPMENT",
        },
        {
          id: otherOrderId,
          orderNumber: `OTHER-FILTER-${suffix}`,
          companyId,
          status: "READY_FOR_SHIPMENT",
        },
        {
          id: reviewOrderId,
          orderNumber: `REVIEW-FILTER-${suffix}`,
          companyId,
          status: "WAITING_FOR_APPROVAL",
        },
        {
          id: deliveredOrderId,
          orderNumber: `DELIVERED-FILTER-${suffix}`,
          companyId,
          status: "DELIVERED",
        },
        {
          id: heldOrderId,
          orderNumber: `HELD-FILTER-${suffix}`,
          companyId,
          status: "ON_HOLD",
        },
        {
          id: draftOrderId,
          orderNumber: `DRAFT-FILTER-${suffix}`,
          companyId,
          status: "DRAFT",
        },
      ],
    });
    await prisma.shipment.createMany({
      data: [
        {
          orderId: cityOrderId,
          carrier: "CITY_LOJISTIK",
          trackingNumber: `CITY-TRACK-${suffix}`,
          status: "AWAITING_MANUAL_DISPATCH",
        },
        {
          orderId: otherOrderId,
          carrier: "OTHER",
          status: "PENDING",
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  it("returns every manual City shipment without relying on the five-item overview", async () => {
    const result = await getAdminOrders({
      manualCityOnly: true,
      page: 1,
      pageSize: 25,
    });

    expect(result.orders.map((order) => order.id)).toContain(cityOrderId);
    expect(result.orders.map((order) => order.id)).not.toContain(otherOrderId);
  });

  it("filters operational queues, excludes drafts and searches tracking numbers", async () => {
    const all = await getAdminOrders({
      query: suffix,
      scope: "ALL",
      page: 1,
      pageSize: 25,
    });
    expect(all.total).toBe(5);
    expect(all.orders.map((order) => order.id)).not.toContain(draftOrderId);

    const review = await getAdminOrders({
      query: suffix,
      scope: "REVIEW",
      page: 1,
      pageSize: 25,
    });
    expect(review.orders.map((order) => order.id)).toEqual([reviewOrderId]);

    const blocked = await getAdminOrders({
      query: suffix,
      scope: "BLOCKED",
      page: 1,
      pageSize: 25,
    });
    expect(blocked.orders.map((order) => order.id)).toEqual([heldOrderId]);

    const incompatibleStatus = await getAdminOrders({
      query: suffix,
      scope: "READY_TO_SHIP",
      status: "DELIVERED",
      page: 1,
      pageSize: 25,
    });
    expect(incompatibleStatus.total).toBe(0);

    const tracking = await getAdminOrders({
      query: `CITY-TRACK-${suffix}`,
      page: 1,
      pageSize: 25,
    });
    expect(tracking.orders.map((order) => order.id)).toEqual([cityOrderId]);
  });

  it("clamps an out-of-range page after counting the filtered queue", async () => {
    const result = await getAdminOrders({
      query: suffix,
      page: 999,
      pageSize: 1,
    });
    expect(result.total).toBe(5);
    expect(result.page).toBe(5);
    expect(result.orders).toHaveLength(1);
  });
});
