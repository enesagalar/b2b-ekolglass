import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";

export const stockMovementTypes = [
  "OPENING_BALANCE",
  "INITIAL_STOCK",
  "MANUAL_ADJUSTMENT",
  "CSV_IMPORT",
  "ORDER_RESERVATION",
  "ORDER_RELEASE",
  "ORDER_CONSUME",
] as const;

export type StockMovementType = (typeof stockMovementTypes)[number];

export type StockBalance = {
  quantity: number;
  reservedQuantity: number;
};

type RecordStockMovementInput = {
  stockItemId: string;
  productId: string;
  productCode: string;
  warehouseCode: string;
  movementType: StockMovementType;
  before: StockBalance;
  after: StockBalance;
  actorUserId?: string | null;
  reason: string;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export class StockMovementError extends Error {}

export async function recordStockMovement(
  tx: Prisma.TransactionClient,
  input: RecordStockMovementInput,
) {
  const physicalDelta = input.after.quantity - input.before.quantity;
  const reservedDelta = input.after.reservedQuantity - input.before.reservedQuantity;
  if (physicalDelta === 0 && reservedDelta === 0) return null;
  if (
    input.before.quantity < 0 ||
    input.after.quantity < 0 ||
    input.before.reservedQuantity < 0 ||
    input.after.reservedQuantity < 0 ||
    input.before.reservedQuantity > input.before.quantity ||
    input.after.reservedQuantity > input.after.quantity
  ) {
    throw new StockMovementError("Stok hareketi geçersiz bir bakiye üretiyor.");
  }
  if (!input.reason.trim()) {
    throw new StockMovementError("Stok hareketinde gerekçe zorunludur.");
  }

  const previous = await tx.stockMovement.findFirst({
    where: { stockItemId: input.stockItemId },
    orderBy: { sequence: "desc" },
    select: { sequence: true, afterQuantity: true, afterReservedQuantity: true },
  });
  if (previous && (
    previous.afterQuantity !== input.before.quantity ||
    previous.afterReservedQuantity !== input.before.reservedQuantity
  )) {
    throw new StockMovementError("Stok hareket defteri bakiyesi güncel stokla uyuşmuyor.");
  }
  const sequence = (previous?.sequence ?? 0) + 1;
  const payloadHash = createHash("sha256").update(JSON.stringify({
    stockItemId: input.stockItemId,
    movementType: input.movementType,
    sequence,
    physicalDelta,
    reservedDelta,
    before: input.before,
    after: input.after,
    actorUserId: input.actorUserId ?? null,
    reason: input.reason.trim(),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    metadata: input.metadata ?? null,
  })).digest("hex");

  return tx.stockMovement.create({
    data: {
      stockItemId: input.stockItemId,
      productId: input.productId,
      productCode: input.productCode,
      warehouseCode: input.warehouseCode,
      movementType: input.movementType,
      sequence,
      physicalDelta,
      reservedDelta,
      beforeQuantity: input.before.quantity,
      afterQuantity: input.after.quantity,
      beforeReservedQuantity: input.before.reservedQuantity,
      afterReservedQuantity: input.after.reservedQuantity,
      actorUserId: input.actorUserId,
      reason: input.reason.trim(),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      payloadHash,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}
