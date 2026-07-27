import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAdminOrders } from "@/data/admin-orders";
import { prisma } from "@/lib/prisma";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const companyId = `admin-order-filter-company-${suffix}`;
const cityOrderId = `admin-order-filter-city-${suffix}`;
const otherOrderId = `admin-order-filter-other-${suffix}`;

describe("admin order filters with SQLite", () => {
  beforeAll(async () => {
    await prisma.company.create({
      data: {
        id: companyId,
        legalName: "City Filter Test Ltd.",
        displayName: "City Filter Test",
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
      ],
    });
    await prisma.shipment.createMany({
      data: [
        {
          orderId: cityOrderId,
          carrier: "CITY_LOJISTIK",
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
    await prisma.shipment.deleteMany({ where: { orderId: { in: [cityOrderId, otherOrderId] } } });
    await prisma.order.deleteMany({ where: { id: { in: [cityOrderId, otherOrderId] } } });
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
});

