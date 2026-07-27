import "server-only";

import type { Prisma } from "@/generated/prisma/client";

export async function acquireStockMutationLock(tx: Prisma.TransactionClient) {
  await tx.checkoutLock.upsert({
    where: { id: "stock-mutations" },
    create: { id: "stock-mutations", version: 1 },
    update: { version: { increment: 1 } },
  });
}
