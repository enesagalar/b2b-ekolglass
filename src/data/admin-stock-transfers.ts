import "server-only";

import { prisma } from "@/lib/prisma";

export async function getStockTransferWorkspace(query: string) {
  const q = query.trim();
  const [warehouses, candidates, recentTransfers] = await prisma.$transaction([
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }, { code: "asc" }],
      select: { code: true, name: true },
    }),
    prisma.stockItem.findMany({
      where: {
        quantity: { gt: 0 },
        warehouse: { isActive: true },
        ...(q
          ? {
              product: {
                OR: [
                  { code: { contains: q } },
                  { name: { contains: q } },
                ],
              },
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { product: { code: "asc" } }],
      take: q ? 80 : 50,
      select: {
        id: true,
        productId: true,
        warehouseCode: true,
        quantity: true,
        reservedQuantity: true,
        product: { select: { code: true, name: true } },
        warehouse: { select: { name: true } },
      },
    }),
    prisma.stockTransfer.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        transferNumber: true,
        productId: true,
        productCode: true,
        sourceWarehouseCode: true,
        destinationWarehouseCode: true,
        quantity: true,
        reason: true,
        createdAt: true,
        actor: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
  ]);

  return {
    warehouses,
    sourceOptions: candidates
      .map((row) => ({
        ...row,
        availableQuantity: row.quantity - row.reservedQuantity,
      }))
      .filter((row) => row.availableQuantity > 0),
    recentTransfers,
  };
}
