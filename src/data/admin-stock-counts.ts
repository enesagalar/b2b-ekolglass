import "server-only";

import { prisma } from "@/lib/prisma";

export async function getStockCountWorkspace(query: string) {
  const q = query.trim();
  const candidateFilter = {
    warehouse: { isActive: true },
    countSessions: { none: { status: "OPEN" } },
    ...(q
      ? {
          product: {
            OR: [{ code: { contains: q } }, { name: { contains: q } }],
          },
        }
      : {}),
  };

  const [candidates, openSessions, recentSessions] = await prisma.$transaction([
    prisma.stockItem.findMany({
      where: candidateFilter,
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
    prisma.stockCountSession.findMany({
      where: { status: "OPEN" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        countNumber: true,
        productId: true,
        productCode: true,
        warehouseCode: true,
        expectedQuantity: true,
        expectedReservedQuantity: true,
        expectedStockUpdatedAt: true,
        createdAt: true,
        openedBy: { select: { name: true } },
        product: { select: { name: true } },
        warehouse: { select: { name: true } },
        stockItem: {
          select: {
            quantity: true,
            reservedQuantity: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.stockCountSession.findMany({
      where: { status: { in: ["APPLIED", "STALE", "CANCELLED"] } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        countNumber: true,
        productId: true,
        productCode: true,
        warehouseCode: true,
        status: true,
        expectedQuantity: true,
        expectedReservedQuantity: true,
        countedQuantity: true,
        differenceQuantity: true,
        submissionReason: true,
        staleCode: true,
        cancellationReason: true,
        submittedAt: true,
        cancelledAt: true,
        openedBy: { select: { name: true } },
        submittedBy: { select: { name: true } },
        cancelledBy: { select: { name: true } },
        product: { select: { name: true } },
        warehouse: { select: { name: true } },
      },
    }),
  ]);

  return {
    candidates: candidates.map((row) => ({
      ...row,
      availableQuantity: row.quantity - row.reservedQuantity,
    })),
    openSessions: openSessions.map((session) => ({
      ...session,
      balanceChanged:
        session.stockItem.quantity !== session.expectedQuantity ||
        session.stockItem.reservedQuantity !==
          session.expectedReservedQuantity ||
        session.stockItem.updatedAt.getTime() !==
          session.expectedStockUpdatedAt.getTime(),
    })),
    recentSessions,
  };
}
