import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { getStatusLabel } from "@/domain/statuses";
import {
  deriveStockOperationalClass,
  StockReportLimitError,
  stockOperationalLabels,
  type StockCsvRow,
  type StockReportFilters,
} from "@/domain/stock-reporting";
import { prisma } from "@/lib/prisma";

const pageSize = 25;
const maxStockSnapshotRows = 10_000;
export const maxStockExportRows = 5_000;

const visibilityLabels: Record<string, string> = {
  HIDDEN: "Gizli",
  SIMPLIFIED: "Sade",
  DETAILED: "Detaylı",
};

function stockWhere(filters: StockReportFilters) {
  return {
    product: {
      status: filters.productStatus,
      ...(filters.q
        ? {
            OR: [
              { code: { contains: filters.q } },
              { name: { contains: filters.q } },
              { vehicleBrand: { contains: filters.q } },
              { vehicleModel: { contains: filters.q } },
            ],
          }
        : {}),
    },
    ...(filters.warehouse ? { warehouseCode: filters.warehouse } : {}),
    ...(filters.status !== "ALL" ? { status: filters.status } : {}),
  } satisfies Prisma.StockItemWhereInput;
}

const stockSelect = {
  id: true,
  warehouseCode: true,
  quantity: true,
  reservedQuantity: true,
  visibility: true,
  status: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      category: { select: { name: true } },
    },
  },
} satisfies Prisma.StockItemSelect;

type StockRow = Prisma.StockItemGetPayload<{ select: typeof stockSelect }> & {
  availableQuantity: number;
  operationalClass: ReturnType<typeof deriveStockOperationalClass>;
  operationalStatusLabel: string;
  declaredStatusLabel: string;
  visibilityLabel: string;
  ledgerReservedQuantity: number;
  hasLedgerMismatch: boolean;
  movementPhysicalQuantity: number;
  movementReservedQuantity: number;
  hasMovementMismatch: boolean;
};

function compareRows(a: StockRow, b: StockRow, sort: StockReportFilters["sort"]) {
  const codeOrder = a.product.code.localeCompare(b.product.code, "tr");
  const warehouseOrder = a.warehouseCode.localeCompare(b.warehouseCode, "tr");
  const tieBreak = codeOrder || warehouseOrder || a.id.localeCompare(b.id);
  switch (sort) {
    case "UPDATED_DESC":
      return b.updatedAt.getTime() - a.updatedAt.getTime() || a.id.localeCompare(b.id);
    case "CODE_ASC":
      return tieBreak;
    case "QUANTITY_ASC":
      return a.quantity - b.quantity || tieBreak;
    case "RESERVED_DESC":
      return b.reservedQuantity - a.reservedQuantity || tieBreak;
    default:
      return a.availableQuantity - b.availableQuantity || tieBreak;
  }
}

async function loadStockSnapshot(filters: StockReportFilters) {
  return prisma.$transaction(async (tx) => {
    const rawRows = await tx.stockItem.findMany({
      where: stockWhere(filters),
      take: maxStockSnapshotRows + 1,
      select: stockSelect,
    });
    if (rawRows.length > maxStockSnapshotRows) {
      throw new StockReportLimitError(`Stok raporu ${maxStockSnapshotRows} satırla sınırlıdır; filtreleri daraltın.`);
    }
    const warehouses = await tx.stockItem.findMany({
      distinct: ["warehouseCode"],
      orderBy: { warehouseCode: "asc" },
      select: { warehouseCode: true },
    });
    const activeReservations = rawRows.length
      ? await tx.stockReservation.groupBy({
          by: ["stockItemId"],
          where: { status: "ACTIVE", stockItemId: { in: rawRows.map((row) => row.id) } },
          _sum: { quantity: true },
        })
      : [];
    const movementBalances = rawRows.length
      ? await tx.stockMovement.groupBy({
          by: ["stockItemId"],
          where: { stockItemId: { in: rawRows.map((row) => row.id) } },
          _sum: { physicalDelta: true, reservedDelta: true },
        })
      : [];
    const ledgerMap = new Map(
      activeReservations.map((reservation) => [
        reservation.stockItemId,
        reservation._sum.quantity ?? 0,
      ]),
    );
    const snapshotAt = new Date();
    const movementMap = new Map(movementBalances.map((movement) => [movement.stockItemId, {
      quantity: movement._sum.physicalDelta ?? 0,
      reservedQuantity: movement._sum.reservedDelta ?? 0,
    }]));
    const rows: StockRow[] = rawRows.map((row) => {
      const availableQuantity = row.quantity - row.reservedQuantity;
      const operationalClass = deriveStockOperationalClass(row.quantity, row.reservedQuantity);
      const ledgerReservedQuantity = ledgerMap.get(row.id) ?? 0;
      const movementBalance = movementMap.get(row.id) ?? { quantity: 0, reservedQuantity: 0 };
      const hasMovementMismatch = movementBalance.quantity !== row.quantity || movementBalance.reservedQuantity !== row.reservedQuantity;
      return {
        ...row,
        availableQuantity,
        operationalClass,
        operationalStatusLabel: stockOperationalLabels[operationalClass],
        declaredStatusLabel: getStatusLabel(row.status),
        visibilityLabel: visibilityLabels[row.visibility] ?? row.visibility,
        ledgerReservedQuantity,
        hasLedgerMismatch: ledgerReservedQuantity !== row.reservedQuantity || hasMovementMismatch,
        movementPhysicalQuantity: movementBalance.quantity,
        movementReservedQuantity: movementBalance.reservedQuantity,
        hasMovementMismatch,
      };
    }).filter((row) =>
      filters.availability === "ALL" || row.operationalClass === filters.availability,
    );
    rows.sort((a, b) => compareRows(a, b, filters.sort));
    return { rows, warehouses: warehouses.map((item) => item.warehouseCode), snapshotAt };
  });
}

export async function getAdminStockReport(filters: StockReportFilters) {
  const snapshot = await loadStockSnapshot(filters);
  const totalRows = snapshot.rows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(filters.page, pageCount);
  const rows = snapshot.rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const physicalQuantity = snapshot.rows.reduce((sum, row) => sum + row.quantity, 0);
  const reservedQuantity = snapshot.rows.reduce((sum, row) => sum + row.reservedQuantity, 0);

  return {
    metrics: {
      stockRecordCount: totalRows,
      physicalQuantity,
      reservedQuantity,
      availableQuantity: physicalQuantity - reservedQuantity,
      physicalOutCount: snapshot.rows.filter((row) => row.operationalClass === "PHYSICAL_OUT").length,
      fullyReservedCount: snapshot.rows.filter((row) => row.operationalClass === "FULLY_RESERVED").length,
      lowAvailableCount: snapshot.rows.filter((row) => row.operationalClass === "LOW_AVAILABLE").length,
      askForAvailabilityCount: snapshot.rows.filter((row) => row.status === "ASK_FOR_AVAILABILITY").length,
      ledgerMismatchCount: snapshot.rows.filter((row) => row.hasLedgerMismatch).length,
    },
    rows,
    warehouses: snapshot.warehouses,
    snapshotAt: snapshot.snapshotAt,
    pagination: { currentPage, pageCount, totalRows, pageSize },
  };
}

export async function getAdminStockExportRows(filters: StockReportFilters): Promise<{ rows: StockCsvRow[]; snapshotAt: Date }> {
  const snapshot = await loadStockSnapshot(filters);
  if (snapshot.rows.length > maxStockExportRows) {
    throw new StockReportLimitError(`Dışa aktarım en fazla ${maxStockExportRows} stok satırı içerebilir; filtreleri daraltın.`);
  }
  return { snapshotAt: snapshot.snapshotAt, rows: snapshot.rows.map((row) => ({
    productCode: row.product.code,
    productName: row.product.name,
    categoryName: row.product.category.name,
    productStatus: getStatusLabel(row.product.status),
    warehouseCode: row.warehouseCode,
    quantity: row.quantity,
    reservedQuantity: row.reservedQuantity,
    availableQuantity: row.availableQuantity,
    operationalStatusLabel: row.operationalStatusLabel,
    declaredStatusLabel: row.declaredStatusLabel,
    visibilityLabel: row.visibilityLabel,
    ledgerStatusLabel: row.hasLedgerMismatch
      ? [
          row.reservedQuantity !== row.ledgerReservedQuantity
            ? `rezervasyon sayacı ${row.reservedQuantity}, aktif rezervasyon ${row.ledgerReservedQuantity}`
            : null,
          row.hasMovementMismatch
            ? `stok sayacı ${row.quantity}/${row.reservedQuantity}, hareket defteri ${row.movementPhysicalQuantity}/${row.movementReservedQuantity}`
            : null,
        ].filter(Boolean).join("; ")
      : "Tutarlı",
    updatedAt: row.updatedAt,
    snapshotAt: snapshot.snapshotAt,
  })) };
}
