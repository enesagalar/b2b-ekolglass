import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildStockReportCsv,
  resolveStockReportFilters,
} from "@/domain/stock-reporting";
import { getStatusLabel } from "@/domain/statuses";
import { recordStockMovement } from "@/domain/stock-movement";
import { prisma } from "@/lib/prisma";

import {
  getAdminStockExportRows,
  getAdminStockReport,
} from "./admin-stock-reports";

const suffix = randomUUID();
const codePrefix = `SR-${suffix}`;
const ids = {
  category: `stock-report-category-${suffix}`,
  company: `stock-report-company-${suffix}`,
  user: `stock-report-user-${suffix}`,
  order: `stock-report-order-${suffix}`,
  releasedOrder: `stock-report-released-order-${suffix}`,
  physicalProduct: `stock-report-physical-product-${suffix}`,
  reservedProduct: `stock-report-reserved-product-${suffix}`,
  sharedProduct: `stock-report-shared-product-${suffix}`,
  inactiveProduct: `stock-report-inactive-product-${suffix}`,
  physicalStock: `stock-report-physical-stock-${suffix}`,
  reservedStock: `stock-report-reserved-stock-${suffix}`,
  lowStock: `stock-report-low-stock-${suffix}`,
  availableStock: `stock-report-available-stock-${suffix}`,
  inactiveStock: `stock-report-inactive-stock-${suffix}`,
  physicalOrderItem: `stock-report-physical-item-${suffix}`,
  reservedOrderItem: `stock-report-reserved-item-${suffix}`,
  sharedOrderItem: `stock-report-shared-item-${suffix}`,
  releasedOrderItem: `stock-report-released-item-${suffix}`,
};

const productIds = [
  ids.physicalProduct,
  ids.reservedProduct,
  ids.sharedProduct,
  ids.inactiveProduct,
];
const stockIds = [
  ids.physicalStock,
  ids.reservedStock,
  ids.lowStock,
  ids.availableStock,
  ids.inactiveStock,
];

describe("admin stock reports", () => {
  beforeAll(async () => {
    await prisma.productCategory.create({
      data: {
        id: ids.category,
        slug: `stock-report-${suffix}`,
        name: "Stock Report Integration",
      },
    });
    await prisma.product.createMany({
      data: [
        {
          id: ids.physicalProduct,
          code: `${codePrefix}-A-PHYSICAL`,
          name: `${codePrefix} Physical Product`,
          categoryId: ids.category,
          glassType: "Laminated",
          status: "ACTIVE",
        },
        {
          id: ids.reservedProduct,
          code: `${codePrefix}-B-RESERVED`,
          name: `${codePrefix} Reserved Product`,
          categoryId: ids.category,
          glassType: "Laminated",
          status: "ACTIVE",
        },
        {
          id: ids.sharedProduct,
          code: `${codePrefix}-C-SHARED`,
          name: `${codePrefix} Shared Product`,
          categoryId: ids.category,
          glassType: "Tempered",
          status: "ACTIVE",
        },
        {
          id: ids.inactiveProduct,
          code: `${codePrefix}-D-INACTIVE`,
          name: `${codePrefix} Inactive Product`,
          categoryId: ids.category,
          glassType: "Tempered",
          status: "DISCONTINUED",
        },
      ],
    });
    await prisma.stockItem.createMany({
      data: [
        {
          id: ids.physicalStock,
          productId: ids.physicalProduct,
          warehouseCode: "SR-A",
          quantity: 0,
          reservedQuantity: 0,
          status: "IN_STOCK",
        },
        {
          id: ids.reservedStock,
          productId: ids.reservedProduct,
          warehouseCode: "SR-B",
          quantity: 3,
          reservedQuantity: 3,
          status: "ASK_FOR_AVAILABILITY",
        },
        {
          id: ids.lowStock,
          productId: ids.sharedProduct,
          warehouseCode: "SR-C",
          quantity: 5,
          reservedQuantity: 2,
          status: "OUT_OF_STOCK",
        },
        {
          id: ids.availableStock,
          productId: ids.sharedProduct,
          warehouseCode: "SR-D",
          quantity: 10,
          reservedQuantity: 2,
          status: "LOW_STOCK",
        },
        {
          id: ids.inactiveStock,
          productId: ids.inactiveProduct,
          warehouseCode: "SR-E",
          quantity: 99,
          reservedQuantity: 0,
          status: "IN_STOCK",
        },
      ],
    });
    await prisma.$transaction(async (tx) => {
      const stocks = await tx.stockItem.findMany({
        where: { id: { in: stockIds } },
        include: { product: { select: { code: true } } },
      });
      for (const stock of stocks) {
        await recordStockMovement(tx, {
          stockItemId: stock.id,
          productId: stock.productId,
          productCode: stock.product.code,
          warehouseCode: stock.warehouseCode,
          movementType: "OPENING_BALANCE",
          before: { quantity: 0, reservedQuantity: 0 },
          after: { quantity: stock.quantity, reservedQuantity: stock.reservedQuantity },
          reason: "Stok raporu entegrasyon testi acilis bakiyesi.",
          sourceType: "TEST_FIXTURE",
          sourceId: stock.id,
          idempotencyKey: `stock-report-opening:${stock.id}`,
        });
      }
    });
    await prisma.company.create({
      data: {
        id: ids.company,
        legalName: "Stock Report Integration Company",
        displayName: "Stock Report Integration",
        email: `stock-report-${suffix}@example.com`,
        phone: "1",
        city: "Istanbul",
        status: "APPROVED",
      },
    });
    await prisma.user.create({
      data: {
        id: ids.user,
        email: `stock-report-user-${suffix}@example.com`,
        name: "Stock Report User",
        role: "DEALER_OWNER",
        status: "ACTIVE",
        companyId: ids.company,
      },
    });
    await prisma.order.createMany({
      data: [
        {
          id: ids.order,
          orderNumber: `STOCK-REPORT-${suffix}`,
          companyId: ids.company,
          createdById: ids.user,
          status: "SUBMITTED",
        },
        {
          id: ids.releasedOrder,
          orderNumber: `STOCK-REPORT-RELEASED-${suffix}`,
          companyId: ids.company,
          createdById: ids.user,
          status: "CANCELLED",
        },
      ],
    });
    await prisma.orderItem.createMany({
      data: [
        {
          id: ids.physicalOrderItem,
          orderId: ids.order,
          productId: ids.physicalProduct,
          quantity: 1,
          productCodeSnapshot: `${codePrefix}-A-PHYSICAL`,
          productNameSnapshot: "Physical Product",
          glassTypeSnapshot: "Laminated",
        },
        {
          id: ids.reservedOrderItem,
          orderId: ids.order,
          productId: ids.reservedProduct,
          quantity: 3,
          productCodeSnapshot: `${codePrefix}-B-RESERVED`,
          productNameSnapshot: "Reserved Product",
          glassTypeSnapshot: "Laminated",
        },
        {
          id: ids.sharedOrderItem,
          orderId: ids.order,
          productId: ids.sharedProduct,
          quantity: 3,
          productCodeSnapshot: `${codePrefix}-C-SHARED`,
          productNameSnapshot: "Shared Product",
          glassTypeSnapshot: "Tempered",
        },
        {
          id: ids.releasedOrderItem,
          orderId: ids.releasedOrder,
          productId: ids.sharedProduct,
          quantity: 4,
          productCodeSnapshot: `${codePrefix}-C-SHARED`,
          productNameSnapshot: "Shared Product",
          glassTypeSnapshot: "Tempered",
        },
      ],
    });
    await prisma.stockReservation.createMany({
      data: [
        {
          orderItemId: ids.reservedOrderItem,
          stockItemId: ids.reservedStock,
          quantity: 3,
          status: "ACTIVE",
        },
        {
          orderItemId: ids.sharedOrderItem,
          stockItemId: ids.lowStock,
          quantity: 1,
          status: "ACTIVE",
        },
        {
          orderItemId: ids.sharedOrderItem,
          stockItemId: ids.availableStock,
          quantity: 2,
          status: "ACTIVE",
        },
        {
          orderItemId: ids.releasedOrderItem,
          stockItemId: ids.lowStock,
          quantity: 4,
          status: "RELEASED",
          releasedAt: new Date(),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.stockReservation.deleteMany({ where: { stockItemId: { in: stockIds } } });
    await prisma.order.deleteMany({ where: { id: { in: [ids.order, ids.releasedOrder] } } });
    await prisma.stockItem.deleteMany({ where: { id: { in: stockIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.productCategory.deleteMany({ where: { id: ids.category } });
    await prisma.user.deleteMany({ where: { id: ids.user } });
    await prisma.company.deleteMany({ where: { id: ids.company } });
  });

  it("uses the default ACTIVE product scope and reports product plus warehouse grain", async () => {
    const filters = resolveStockReportFilters({ q: codePrefix });
    const report = await getAdminStockReport(filters);

    expect(filters.productStatus).toBe("ACTIVE");
    expect(report.rows.map((row) => row.id)).toEqual([
      ids.physicalStock,
      ids.reservedStock,
      ids.lowStock,
      ids.availableStock,
    ]);
    expect(report.rows).toHaveLength(4);
    expect(report.rows.filter((row) => row.product.id === ids.sharedProduct)).toHaveLength(2);
    expect(report.rows.map((row) => `${row.product.code}:${row.warehouseCode}`)).toEqual([
      `${codePrefix}-A-PHYSICAL:SR-A`,
      `${codePrefix}-B-RESERVED:SR-B`,
      `${codePrefix}-C-SHARED:SR-C`,
      `${codePrefix}-C-SHARED:SR-D`,
    ]);
    expect(report.metrics).toMatchObject({
      stockRecordCount: 4,
      physicalQuantity: 18,
      reservedQuantity: 7,
      availableQuantity: 11,
      physicalOutCount: 1,
      fullyReservedCount: 1,
      lowAvailableCount: 1,
      askForAvailabilityCount: 1,
      ledgerMismatchCount: 1,
    });
    expect(report.rows.map((row) => row.operationalClass)).toEqual([
      "PHYSICAL_OUT",
      "FULLY_RESERVED",
      "LOW_AVAILABLE",
      "AVAILABLE",
    ]);

    const physicalRow = report.rows.find((row) => row.id === ids.physicalStock);
    expect(physicalRow).toMatchObject({
      status: "IN_STOCK",
      operationalClass: "PHYSICAL_OUT",
      declaredStatusLabel: getStatusLabel("IN_STOCK"),
    });
    expect(physicalRow?.declaredStatusLabel).not.toBe(physicalRow?.operationalStatusLabel);

    const mismatchRow = report.rows.find((row) => row.id === ids.lowStock);
    expect(mismatchRow).toMatchObject({
      reservedQuantity: 2,
      ledgerReservedQuantity: 1,
      hasLedgerMismatch: true,
    });
    expect(report.rows.filter((row) => row.hasLedgerMismatch).map((row) => row.id)).toEqual([
      ids.lowStock,
    ]);
  });

  it("filters by operational availability and keeps AVAILABLE_ASC deterministic", async () => {
    const allRows = await getAdminStockReport(resolveStockReportFilters({ q: codePrefix }));
    expect(allRows.rows.map((row) => [row.availableQuantity, row.id])).toEqual([
      [0, ids.physicalStock],
      [0, ids.reservedStock],
      [3, ids.lowStock],
      [8, ids.availableStock],
    ]);

    const lowRows = await getAdminStockReport(resolveStockReportFilters({
      q: codePrefix,
      availability: "LOW_AVAILABLE",
    }));
    expect(lowRows.rows.map((row) => row.id)).toEqual([ids.lowStock]);
    expect(lowRows.metrics).toMatchObject({
      stockRecordCount: 1,
      physicalQuantity: 5,
      reservedQuantity: 2,
      availableQuantity: 3,
      lowAvailableCount: 1,
    });
  });

  it("exports every row in the filtered snapshot with declared and ledger states", async () => {
    const filters = resolveStockReportFilters({ q: codePrefix });
    const { rows: exportRows, snapshotAt } = await getAdminStockExportRows(filters);
    const csv = buildStockReportCsv(exportRows);

    expect(exportRows.map((row) => `${row.productCode}:${row.warehouseCode}`)).toEqual([
      `${codePrefix}-A-PHYSICAL:SR-A`,
      `${codePrefix}-B-RESERVED:SR-B`,
      `${codePrefix}-C-SHARED:SR-C`,
      `${codePrefix}-C-SHARED:SR-D`,
    ]);
    expect(exportRows.find((row) => row.warehouseCode === "SR-C")).toMatchObject({
      quantity: 5,
      reservedQuantity: 2,
      availableQuantity: 3,
      declaredStatusLabel: getStatusLabel("OUT_OF_STOCK"),
    });
    expect(exportRows.find((row) => row.warehouseCode === "SR-C")?.ledgerStatusLabel)
      .toContain("1");
    expect(exportRows.every((row) => row.snapshotAt.getTime() === snapshotAt.getTime())).toBe(true);
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(5);
    expect(csv).not.toContain(`${codePrefix}-D-INACTIVE`);
  });
});
