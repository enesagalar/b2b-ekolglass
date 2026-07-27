import "server-only";

import { prisma } from "@/lib/prisma";

export async function getActiveWarehouseOptions() {
  return prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }, { code: "asc" }],
    select: { code: true, name: true },
  });
}

export async function getAdminWarehouses() {
  const [warehouses, stockBalances] = await prisma.$transaction([
    prisma.warehouse.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }, { code: "asc" }],
      include: {
        _count: {
          select: { stockItems: true },
        },
      },
    }),
    prisma.stockItem.groupBy({
      by: ["warehouseCode"],
      orderBy: { warehouseCode: "asc" },
      _sum: { quantity: true, reservedQuantity: true },
    }),
  ]);

  const balanceByCode = new Map(
    stockBalances.map((balance) => [
      balance.warehouseCode,
      {
        quantity: balance._sum?.quantity ?? 0,
        reservedQuantity: balance._sum?.reservedQuantity ?? 0,
      },
    ]),
  );

  const rows = warehouses.map((warehouse) => {
    const balance = balanceByCode.get(warehouse.code) ?? {
      quantity: 0,
      reservedQuantity: 0,
    };

    return {
      ...warehouse,
      stockRecordCount: warehouse._count.stockItems,
      physicalQuantity: balance.quantity,
      reservedQuantity: balance.reservedQuantity,
      availableQuantity: balance.quantity - balance.reservedQuantity,
    };
  });

  return {
    rows,
    metrics: {
      totalCount: rows.length,
      activeCount: rows.filter((warehouse) => warehouse.isActive).length,
      physicalQuantity: rows.reduce(
        (sum, warehouse) => sum + warehouse.physicalQuantity,
        0,
      ),
      reservedQuantity: rows.reduce(
        (sum, warehouse) => sum + warehouse.reservedQuantity,
        0,
      ),
    },
  };
}
