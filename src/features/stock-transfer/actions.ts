"use server";

import { Prisma } from "@/generated/prisma/client";
import { deriveStockStatus } from "@/domain/stock-status";
import {
  getStockTransferNumber,
  getStockTransferPayloadHash,
  stockTransferFormSchema,
  type StockTransferCommand,
} from "@/domain/stock-transfer";
import { recordStockMovement } from "@/domain/stock-movement";
import { requirePermissionUser } from "@/lib/auth";
import { revalidatePathsBestEffort } from "@/lib/cache-revalidation";
import { prisma } from "@/lib/prisma";
import { acquireStockMutationLock } from "@/data/stock-mutation-lock";

export type StockTransferActionState = {
  ok: boolean;
  message: string;
  transferNumber?: string;
};

type StockTransferActionInput = FormData | StockTransferActionState;

const failure = (message: string): StockTransferActionState => ({
  ok: false,
  message,
});

function resolveFormData(
  input: StockTransferActionInput,
  maybeFormData?: FormData,
) {
  return input instanceof FormData ? input : maybeFormData;
}

function getPayload(command: StockTransferCommand) {
  return {
    productId: command.productId,
    sourceWarehouseCode: command.sourceWarehouseCode,
    destinationWarehouseCode: command.destinationWarehouseCode,
    quantity: command.quantity,
    reason: command.reason,
  };
}

async function resolveReplay(
  idempotencyKey: string,
  payloadHash: string,
): Promise<StockTransferActionState | null> {
  const existing = await prisma.stockTransfer.findUnique({
    where: { idempotencyKey },
    select: { transferNumber: true, payloadHash: true },
  });
  if (!existing) return null;
  if (existing.payloadHash !== payloadHash) {
    return failure(
      "Bu işlem anahtarı farklı bir transfer için kullanılmış. Sayfayı yenileyip yeniden deneyin.",
    );
  }
  return {
    ok: true,
    message: "Bu transfer daha önce tamamlanmış; stok ikinci kez değiştirilmedi.",
    transferNumber: existing.transferNumber,
  };
}

export async function createStockTransfer(
  input: StockTransferActionInput,
  maybeFormData?: FormData,
): Promise<StockTransferActionState> {
  const actor = await requirePermissionUser(
    "stock.transfer",
    "/admin/stok/transferler",
  );
  const formData = resolveFormData(input, maybeFormData);
  if (!formData) return failure("Transfer formu alınamadı.");
  if (formData.get("confirmed") !== "on") {
    return failure("Transfer etkisini onaylamalısınız.");
  }

  const parsed = stockTransferFormSchema.safeParse({
    productId: formData.get("productId"),
    sourceWarehouseCode: formData.get("sourceWarehouseCode"),
    destinationWarehouseCode: formData.get("destinationWarehouseCode"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) {
    return failure(
      parsed.error.issues[0]?.message ?? "Transfer bilgileri geçersiz.",
    );
  }

  const payloadHash = getStockTransferPayloadHash(
    getPayload(parsed.data),
    actor.id,
  );
  const replay = await resolveReplay(parsed.data.idempotencyKey, payloadHash);
  if (replay) return replay;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await acquireStockMutationLock(tx);
      const existing = await tx.stockTransfer.findUnique({
        where: { idempotencyKey: parsed.data.idempotencyKey },
        select: { transferNumber: true, payloadHash: true },
      });
      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          throw new Error("TRANSFER_IDEMPOTENCY_CONFLICT");
        }
        return { replay: true, transferNumber: existing.transferNumber };
      }

      const [product, warehouses, source] = await Promise.all([
        tx.product.findUnique({
          where: { id: parsed.data.productId },
          select: { id: true, code: true },
        }),
        tx.warehouse.findMany({
          where: {
            code: {
              in: [
                parsed.data.sourceWarehouseCode,
                parsed.data.destinationWarehouseCode,
              ],
            },
          },
          select: { code: true, isActive: true },
        }),
        tx.stockItem.findUnique({
          where: {
            productId_warehouseCode: {
              productId: parsed.data.productId,
              warehouseCode: parsed.data.sourceWarehouseCode,
            },
          },
        }),
      ]);
      if (!product) throw new Error("TRANSFER_PRODUCT_NOT_FOUND");
      if (warehouses.length !== 2) throw new Error("TRANSFER_WAREHOUSE_NOT_FOUND");
      if (warehouses.some((warehouse) => !warehouse.isActive)) {
        throw new Error("TRANSFER_WAREHOUSE_INACTIVE");
      }
      if (!source) throw new Error("TRANSFER_SOURCE_STOCK_NOT_FOUND");

      const availableQuantity = source.quantity - source.reservedQuantity;
      if (availableQuantity < parsed.data.quantity) {
        throw new Error("TRANSFER_INSUFFICIENT_AVAILABLE");
      }

      const destination = await tx.stockItem.findUnique({
        where: {
          productId_warehouseCode: {
            productId: product.id,
            warehouseCode: parsed.data.destinationWarehouseCode,
          },
        },
      });
      const transferId = crypto.randomUUID();
      const transferNumber = getStockTransferNumber(
        parsed.data.idempotencyKey,
      );

      const sourceAfterQuantity = source.quantity - parsed.data.quantity;
      const sourceUpdate = await tx.stockItem.updateMany({
        where: {
          id: source.id,
          quantity: source.quantity,
          reservedQuantity: source.reservedQuantity,
          updatedAt: source.updatedAt,
        },
        data: {
          quantity: sourceAfterQuantity,
          status: deriveStockStatus(
            sourceAfterQuantity,
            source.reservedQuantity,
          ),
        },
      });
      if (sourceUpdate.count !== 1) throw new Error("TRANSFER_STALE_BALANCE");
      const sourceAfter = {
        quantity: sourceAfterQuantity,
        reservedQuantity: source.reservedQuantity,
      };
      const sourceMovement = await recordStockMovement(tx, {
        stockItemId: source.id,
        productId: product.id,
        productCode: product.code,
        warehouseCode: source.warehouseCode,
        movementType: "TRANSFER_OUT",
        before: {
          quantity: source.quantity,
          reservedQuantity: source.reservedQuantity,
        },
        after: sourceAfter,
        actorUserId: actor.id,
        reason: parsed.data.reason,
        sourceType: "WAREHOUSE_TRANSFER",
        sourceId: transferId,
        idempotencyKey: `warehouse-transfer:${transferId}:OUT`,
        metadata: {
          transferNumber,
          counterpartyWarehouseCode: parsed.data.destinationWarehouseCode,
        },
      });

      const destinationBefore = {
        quantity: destination?.quantity ?? 0,
        reservedQuantity: destination?.reservedQuantity ?? 0,
      };
      const destinationAfter = {
        quantity: destinationBefore.quantity + parsed.data.quantity,
        reservedQuantity: destinationBefore.reservedQuantity,
      };
      let destinationStockId: string;
      if (destination) {
        const destinationUpdate = await tx.stockItem.updateMany({
          where: {
            id: destination.id,
            quantity: destination.quantity,
            reservedQuantity: destination.reservedQuantity,
            updatedAt: destination.updatedAt,
          },
          data: {
            quantity: destinationAfter.quantity,
            status: deriveStockStatus(
              destinationAfter.quantity,
              destinationAfter.reservedQuantity,
            ),
          },
        });
        if (destinationUpdate.count !== 1) {
          throw new Error("TRANSFER_STALE_BALANCE");
        }
        destinationStockId = destination.id;
      } else {
        const created = await tx.stockItem.create({
          data: {
            productId: product.id,
            warehouseCode: parsed.data.destinationWarehouseCode,
            quantity: destinationAfter.quantity,
            reservedQuantity: 0,
            visibility: source.visibility,
            status: deriveStockStatus(destinationAfter.quantity, 0),
          },
        });
        destinationStockId = created.id;
      }
      const destinationMovement = await recordStockMovement(tx, {
        stockItemId: destinationStockId,
        productId: product.id,
        productCode: product.code,
        warehouseCode: parsed.data.destinationWarehouseCode,
        movementType: "TRANSFER_IN",
        before: destinationBefore,
        after: destinationAfter,
        actorUserId: actor.id,
        reason: parsed.data.reason,
        sourceType: "WAREHOUSE_TRANSFER",
        sourceId: transferId,
        idempotencyKey: `warehouse-transfer:${transferId}:IN`,
        metadata: {
          transferNumber,
          counterpartyWarehouseCode: source.warehouseCode,
        },
      });
      if (!sourceMovement || !destinationMovement) {
        throw new Error("TRANSFER_STOCK_INTEGRITY");
      }

      const transfer = await tx.stockTransfer.create({
        data: {
          id: transferId,
          transferNumber,
          productId: product.id,
          productCode: product.code,
          sourceWarehouseCode: source.warehouseCode,
          destinationWarehouseCode: parsed.data.destinationWarehouseCode,
          sourceStockItemId: source.id,
          destinationStockItemId: destinationStockId,
          sourceMovementId: sourceMovement.id,
          destinationMovementId: destinationMovement.id,
          quantity: parsed.data.quantity,
          reason: parsed.data.reason,
          actorUserId: actor.id,
          idempotencyKey: parsed.data.idempotencyKey,
          payloadHash,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "stock.transferred",
          entityType: "StockTransfer",
          entityId: transfer.id,
          metadata: JSON.stringify({
            transferNumber: transfer.transferNumber,
            productId: product.id,
            productCode: product.code,
            sourceWarehouseCode: source.warehouseCode,
            destinationWarehouseCode: parsed.data.destinationWarehouseCode,
            quantity: parsed.data.quantity,
            reason: parsed.data.reason,
          }),
        },
      });
      return { replay: false, transferNumber: transfer.transferNumber };
    });

    revalidatePathsBestEffort(
      [
        "/admin/stok",
        "/admin/stok/depolar",
        "/admin/stok/transferler",
        `/admin/urunler/${parsed.data.productId}`,
        "/urunler",
        "/katalog",
      ],
      "stock_transfer.cache_revalidation_failed",
      { productId: parsed.data.productId },
    );
    return {
      ok: true,
      message: result.replay
        ? "Bu transfer daha önce tamamlanmış; stok ikinci kez değiştirilmedi."
        : "Transfer tamamlandı; iki depo bakiyesi ve hareket defteri güncellendi.",
      transferNumber: result.transferNumber,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentReplay = await resolveReplay(
        parsed.data.idempotencyKey,
        payloadHash,
      );
      if (concurrentReplay) return concurrentReplay;
    }
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        TRANSFER_IDEMPOTENCY_CONFLICT:
          "Bu işlem anahtarı farklı bir transfer için kullanılmış. Sayfayı yenileyip yeniden deneyin.",
        TRANSFER_PRODUCT_NOT_FOUND: "Seçilen ürün bulunamadı.",
        TRANSFER_WAREHOUSE_NOT_FOUND:
          "Kaynak veya hedef depo bulunamadı.",
        TRANSFER_WAREHOUSE_INACTIVE:
          "Transfer yalnız aktif depolar arasında yapılabilir.",
        TRANSFER_SOURCE_STOCK_NOT_FOUND:
          "Seçilen ürünün kaynak depoda stok kaydı bulunamadı.",
        TRANSFER_INSUFFICIENT_AVAILABLE:
          "Transfer miktarı kaynak depodaki kullanılabilir stoktan fazla olamaz.",
        TRANSFER_STALE_BALANCE:
          "Stok bakiyesi başka bir işlem tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.",
        TRANSFER_STOCK_INTEGRITY:
          "Stok hareket zinciri doğrulanamadı. Hiçbir bakiye değiştirilmedi.",
      };
      if (messages[error.message]) return failure(messages[error.message]);
    }
    const databaseMessage = error instanceof Error ? error.message : "";
    if (
      databaseMessage.includes("SQLITE_BUSY") ||
      databaseMessage.includes("database is locked")
    ) {
      return failure(
        "Stok sistemi şu anda başka bir işlem yürütüyor. Aynı formu tekrar gönderebilirsiniz.",
      );
    }
    return failure(
      "Transfer tamamlanamadı. Hiçbir depo bakiyesi değiştirilmedi.",
    );
  }
}
