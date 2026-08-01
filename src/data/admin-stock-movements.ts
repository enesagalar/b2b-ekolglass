import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const pageSize = 50;

export type StockMovementFilters = {
  q: string;
  warehouse: string;
  movementType: string;
  sourceType: string;
  from?: Date;
  toExclusive?: Date;
  page: number;
};

export async function getAdminStockMovements(filters: StockMovementFilters) {
  const where = {
    ...(filters.q ? {
      OR: [
        { productCode: { contains: filters.q } },
        { productId: { contains: filters.q } },
        { sourceId: { contains: filters.q } },
      ],
    } : {}),
    ...(filters.warehouse ? { warehouseCode: filters.warehouse } : {}),
    ...(filters.movementType ? { movementType: filters.movementType } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
    ...(filters.from || filters.toExclusive ? {
      createdAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.toExclusive ? { lt: filters.toExclusive } : {}),
      },
    } : {}),
  } satisfies Prisma.StockMovementWhereInput;
  const [totalRows, warehouses, movementTypes, sourceTypes] = await prisma.$transaction([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({ distinct: ["warehouseCode"], orderBy: { warehouseCode: "asc" }, select: { warehouseCode: true } }),
    prisma.stockMovement.findMany({ distinct: ["movementType"], orderBy: { movementType: "asc" }, select: { movementType: true } }),
    prisma.stockMovement.findMany({ distinct: ["sourceType"], orderBy: { sourceType: "asc" }, select: { sourceType: true } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(Math.max(1, filters.page), pageCount);
  const rows = await prisma.stockMovement.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });
  const actorIds = [...new Set(rows.map((row) => row.actorUserId).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
    : [];
  const actorMap = new Map(actors.map((actor) => [actor.id, actor.name]));
  return {
    rows: rows.map((row) => ({ ...row, actorName: row.actorUserId ? actorMap.get(row.actorUserId) ?? "Silinmiş kullanıcı" : "Sistem" })),
    totalRows,
    pageSize,
    pageCount,
    currentPage,
    warehouses: warehouses.map((row) => row.warehouseCode),
    movementTypes: movementTypes.map((row) => row.movementType),
    sourceTypes: sourceTypes.map((row) => row.sourceType),
  };
}
