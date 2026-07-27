"use server";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { acquireStockMutationLock } from "@/data/stock-mutation-lock";
import {
  cancelStockCountSchema,
  completeStockCountSchema,
  getStockCountNumber,
  getStockCountPayloadHash,
  openStockCountSchema,
} from "@/domain/stock-count";
import { recordStockMovement } from "@/domain/stock-movement";
import { deriveStockStatus } from "@/domain/stock-status";
import { requirePermissionUser } from "@/lib/auth";
import { revalidatePathsBestEffort } from "@/lib/cache-revalidation";
import { prisma } from "@/lib/prisma";

export type StockCountActionState = {
  ok: boolean;
  message: string;
  countNumber?: string;
};

type ActionInput = FormData | StockCountActionState;

const failure = (message: string): StockCountActionState => ({
  ok: false,
  message,
});

function resolveFormData(input: ActionInput, maybeFormData?: FormData) {
  return input instanceof FormData ? input : maybeFormData;
}

function revalidateStockCountPaths(productId?: string) {
  revalidatePathsBestEffort(
    [
      "/admin/stok",
      "/admin/stok/sayimlar",
      "/admin/raporlar",
      ...(productId ? [`/admin/urunler/${productId}`] : []),
      "/urunler",
      "/katalog",
    ],
    "stock_count.cache_revalidation_failed",
    productId ? { productId } : undefined,
  );
}

async function resolveOpenReplay(
  idempotencyKey: string,
  payloadHash: string,
): Promise<StockCountActionState | null> {
  const existing = await prisma.stockCountSession.findUnique({
    where: { openIdempotencyKey: idempotencyKey },
    select: { countNumber: true, openPayloadHash: true },
  });
  if (!existing) return null;
  if (existing.openPayloadHash !== payloadHash) {
    return failure(
      "Bu işlem anahtarı farklı bir sayım başlangıcı için kullanılmış. Sayfayı yenileyip yeniden deneyin.",
    );
  }
  return {
    ok: true,
    message: "Bu sayım oturumu daha önce açılmış; ikinci bir kayıt oluşturulmadı.",
    countNumber: existing.countNumber,
  };
}

async function resolveCompletionReplay(
  idempotencyKey: string,
  payloadHash: string,
): Promise<StockCountActionState | null> {
  const existing = await prisma.stockCountSession.findUnique({
    where: { submissionIdempotencyKey: idempotencyKey },
    select: {
      countNumber: true,
      submissionPayloadHash: true,
      status: true,
      staleCode: true,
    },
  });
  if (!existing) return null;
  if (existing.submissionPayloadHash !== payloadHash) {
    return failure(
      "Bu işlem anahtarı farklı bir sayım sonucu için kullanılmış. Sayfayı yenileyip yeniden deneyin.",
    );
  }
  if (existing.status === "STALE") {
    return {
      ok: false,
      message:
        existing.staleCode === "COUNT_BELOW_RESERVED"
          ? "Bu sonuç daha önce kaydedildi ancak rezerve miktarın altında kaldığı için stoğa uygulanmadı."
          : "Bu sonuç daha önce kaydedildi ancak stok bakiyesi değiştiği için stoğa uygulanmadı.",
      countNumber: existing.countNumber,
    };
  }
  return {
    ok: true,
    message: "Bu sayım daha önce tamamlanmış; stok ikinci kez değiştirilmedi.",
    countNumber: existing.countNumber,
  };
}

async function resolveCancellationReplay(
  idempotencyKey: string,
  payloadHash: string,
): Promise<StockCountActionState | null> {
  const existing = await prisma.stockCountSession.findUnique({
    where: { cancellationIdempotencyKey: idempotencyKey },
    select: {
      countNumber: true,
      cancellationPayloadHash: true,
    },
  });
  if (!existing) return null;
  if (existing.cancellationPayloadHash !== payloadHash) {
    return failure(
      "Bu işlem anahtarı farklı bir sayım iptali için kullanılmış. Sayfayı yenileyip yeniden deneyin.",
    );
  }
  return {
    ok: true,
    message: "Bu sayım daha önce iptal edilmiş; ikinci bir işlem yapılmadı.",
    countNumber: existing.countNumber,
  };
}

function databaseBusy(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("SQLITE_BUSY") || message.includes("database is locked");
}

export async function openStockCount(
  input: ActionInput,
  maybeFormData?: FormData,
): Promise<StockCountActionState> {
  const actor = await requirePermissionUser(
    "stock.count",
    "/admin/stok/sayimlar",
  );
  const formData = resolveFormData(input, maybeFormData);
  if (!formData) return failure("Sayım başlangıç formu alınamadı.");

  const parsed = openStockCountSchema.safeParse({
    stockItemId: formData.get("stockItemId"),
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Sayım bilgileri geçersiz.");
  }

  const payloadHash = getStockCountPayloadHash(
    "OPEN",
    { stockItemId: parsed.data.stockItemId },
    actor.id,
  );
  const replay = await resolveOpenReplay(
    parsed.data.idempotencyKey,
    payloadHash,
  );
  if (replay) return replay;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await acquireStockMutationLock(tx);
      const existingReplay = await tx.stockCountSession.findUnique({
        where: { openIdempotencyKey: parsed.data.idempotencyKey },
        select: { countNumber: true, openPayloadHash: true },
      });
      if (existingReplay) {
        if (existingReplay.openPayloadHash !== payloadHash) {
          throw new Error("COUNT_OPEN_IDEMPOTENCY_CONFLICT");
        }
        return {
          replay: true,
          countNumber: existingReplay.countNumber,
          productId: undefined,
        };
      }

      const stock = await tx.stockItem.findUnique({
        where: { id: parsed.data.stockItemId },
        include: {
          product: { select: { id: true, code: true } },
          warehouse: { select: { isActive: true } },
        },
      });
      if (!stock) throw new Error("COUNT_STOCK_NOT_FOUND");
      if (!stock.warehouse.isActive) throw new Error("COUNT_WAREHOUSE_INACTIVE");
      const latestMovement = await tx.stockMovement.findFirst({
        where: { stockItemId: stock.id },
        orderBy: { sequence: "desc" },
        select: {
          sequence: true,
          afterQuantity: true,
          afterReservedQuantity: true,
        },
      });
      if (
        (!latestMovement &&
          (stock.quantity !== 0 || stock.reservedQuantity !== 0)) ||
        (latestMovement &&
          (latestMovement.afterQuantity !== stock.quantity ||
            latestMovement.afterReservedQuantity !== stock.reservedQuantity))
      ) {
        throw new Error("COUNT_LEDGER_MISMATCH");
      }

      const openSession = await tx.stockCountSession.findFirst({
        where: { stockItemId: stock.id, status: "OPEN" },
        select: { countNumber: true },
      });
      if (openSession) throw new Error(`COUNT_ALREADY_OPEN:${openSession.countNumber}`);

      const session = await tx.stockCountSession.create({
        data: {
          id: randomUUID(),
          countNumber: getStockCountNumber(parsed.data.idempotencyKey),
          stockItemId: stock.id,
          productId: stock.product.id,
          productCode: stock.product.code,
          warehouseCode: stock.warehouseCode,
          expectedQuantity: stock.quantity,
          expectedReservedQuantity: stock.reservedQuantity,
          expectedStockUpdatedAt: stock.updatedAt,
          expectedMovementSequence: latestMovement?.sequence ?? 0,
          openedById: actor.id,
          openIdempotencyKey: parsed.data.idempotencyKey,
          openPayloadHash: payloadHash,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "stock_count.opened",
          entityType: "StockCountSession",
          entityId: session.id,
          metadata: JSON.stringify({
            countNumber: session.countNumber,
            productId: stock.product.id,
            productCode: stock.product.code,
            warehouseCode: stock.warehouseCode,
            expectedQuantity: stock.quantity,
            expectedReservedQuantity: stock.reservedQuantity,
          }),
        },
      });
      return {
        replay: false,
        countNumber: session.countNumber,
        productId: stock.product.id,
      };
    });

    revalidateStockCountPaths(result.productId);
    return {
      ok: true,
      message: result.replay
        ? "Bu sayım oturumu daha önce açılmış; ikinci bir kayıt oluşturulmadı."
        : "Sayım oturumu açıldı. Raf sayımını tamamlayıp sonucu kaydedin.",
      countNumber: result.countNumber,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentReplay = await resolveOpenReplay(
        parsed.data.idempotencyKey,
        payloadHash,
      );
      if (concurrentReplay) return concurrentReplay;
      return failure(
        "Bu stok için zaten açık bir sayım bulunuyor. Açık sayımı tamamlayın veya iptal edin.",
      );
    }
    if (error instanceof Error) {
      if (error.message.startsWith("COUNT_ALREADY_OPEN:")) {
        return failure(
          `Bu stok için ${error.message.split(":")[1]} numaralı açık sayım bulunuyor.`,
        );
      }
      const messages: Record<string, string> = {
        COUNT_OPEN_IDEMPOTENCY_CONFLICT:
          "Bu işlem anahtarı farklı bir sayım başlangıcı için kullanılmış. Sayfayı yenileyip yeniden deneyin.",
        COUNT_STOCK_NOT_FOUND: "Seçilen stok kaydı bulunamadı.",
        COUNT_WAREHOUSE_INACTIVE:
          "Pasif depoda yeni sayım başlatılamaz. Önce depo durumunu kontrol edin.",
        COUNT_LEDGER_MISMATCH:
          "Stok bakiyesi ile hareket defteri uyuşmuyor. Sayım başlatmadan önce mutabakatı inceleyin.",
      };
      if (messages[error.message]) return failure(messages[error.message]);
    }
    if (databaseBusy(error)) {
      return failure(
        "Stok sistemi şu anda başka bir işlem yürütüyor. Aynı formu tekrar gönderebilirsiniz.",
      );
    }
    return failure("Sayım oturumu açılamadı. Stok bakiyesi değiştirilmedi.");
  }
}

export async function completeStockCount(
  input: ActionInput,
  maybeFormData?: FormData,
): Promise<StockCountActionState> {
  const actor = await requirePermissionUser(
    "stock.count",
    "/admin/stok/sayimlar",
  );
  const formData = resolveFormData(input, maybeFormData);
  if (!formData) return failure("Sayım sonuç formu alınamadı.");
  if (formData.get("confirmed") !== "on") {
    return failure("Stok farkının uygulanacağını onaylamalısınız.");
  }

  const parsed = completeStockCountSchema.safeParse({
    sessionId: formData.get("sessionId"),
    countedQuantity: formData.get("countedQuantity"),
    reason: formData.get("reason"),
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Sayım sonucu geçersiz.");
  }
  const payloadHash = getStockCountPayloadHash(
    "COMPLETE",
    {
      sessionId: parsed.data.sessionId,
      countedQuantity: parsed.data.countedQuantity,
      reason: parsed.data.reason,
    },
    actor.id,
  );
  const replay = await resolveCompletionReplay(
    parsed.data.idempotencyKey,
    payloadHash,
  );
  if (replay) return replay;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await acquireStockMutationLock(tx);
      const existingReplay = await tx.stockCountSession.findUnique({
        where: { submissionIdempotencyKey: parsed.data.idempotencyKey },
        select: {
          countNumber: true,
          submissionPayloadHash: true,
          productId: true,
          status: true,
          staleCode: true,
        },
      });
      if (existingReplay) {
        if (existingReplay.submissionPayloadHash !== payloadHash) {
          throw new Error("COUNT_COMPLETE_IDEMPOTENCY_CONFLICT");
        }
        return {
          replay: true,
          countNumber: existingReplay.countNumber,
          productId: existingReplay.productId,
          applied: existingReplay.status === "APPLIED",
          staleCode: existingReplay.staleCode,
        };
      }

      const session = await tx.stockCountSession.findUnique({
        where: { id: parsed.data.sessionId },
        include: { stockItem: true },
      });
      if (!session) throw new Error("COUNT_SESSION_NOT_FOUND");
      if (session.status !== "OPEN") throw new Error("COUNT_SESSION_CLOSED");

      const stock = session.stockItem;
      const latestMovement = await tx.stockMovement.findFirst({
        where: { stockItemId: stock.id },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      const staleCode =
        stock.quantity !== session.expectedQuantity ||
        stock.reservedQuantity !== session.expectedReservedQuantity ||
        stock.updatedAt.getTime() !== session.expectedStockUpdatedAt.getTime() ||
        (latestMovement?.sequence ?? 0) !== session.expectedMovementSequence
          ? "COUNT_STALE_BALANCE"
          : parsed.data.countedQuantity < stock.reservedQuantity
            ? "COUNT_BELOW_RESERVED"
            : null;

      const differenceQuantity = parsed.data.countedQuantity - stock.quantity;
      const submittedAt = new Date();
      if (staleCode) {
        const staleUpdate = await tx.stockCountSession.updateMany({
          where: {
            id: session.id,
            status: "OPEN",
            updatedAt: session.updatedAt,
          },
          data: {
            status: "STALE",
            countedQuantity: parsed.data.countedQuantity,
            differenceQuantity:
              parsed.data.countedQuantity - session.expectedQuantity,
            submittedById: actor.id,
            submissionIdempotencyKey: parsed.data.idempotencyKey,
            submissionPayloadHash: payloadHash,
            submissionReason: parsed.data.reason,
            staleCode,
            submittedAt,
          },
        });
        if (staleUpdate.count !== 1) throw new Error("COUNT_SESSION_CLOSED");
        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: "stock_count.review_required",
            entityType: "StockCountSession",
            entityId: session.id,
            metadata: JSON.stringify({
              countNumber: session.countNumber,
              productId: session.productId,
              productCode: session.productCode,
              warehouseCode: session.warehouseCode,
              expectedQuantity: session.expectedQuantity,
              currentQuantity: stock.quantity,
              countedQuantity: parsed.data.countedQuantity,
              currentReservedQuantity: stock.reservedQuantity,
              staleCode,
              reason: parsed.data.reason,
            }),
          },
        });
        return {
          replay: false,
          countNumber: session.countNumber,
          productId: session.productId,
          applied: false,
          staleCode,
        };
      }

      if (differenceQuantity !== 0) {
        const stockUpdate = await tx.stockItem.updateMany({
          where: {
            id: stock.id,
            quantity: stock.quantity,
            reservedQuantity: stock.reservedQuantity,
            updatedAt: stock.updatedAt,
          },
          data: {
            quantity: parsed.data.countedQuantity,
            status: deriveStockStatus(
              parsed.data.countedQuantity,
              stock.reservedQuantity,
            ),
          },
        });
        if (stockUpdate.count !== 1) throw new Error("COUNT_STALE_BALANCE");
      }

      const movement = await recordStockMovement(tx, {
        stockItemId: stock.id,
        productId: session.productId,
        productCode: session.productCode,
        warehouseCode: session.warehouseCode,
        movementType: "INVENTORY_COUNT",
        before: {
          quantity: stock.quantity,
          reservedQuantity: stock.reservedQuantity,
        },
        after: {
          quantity: parsed.data.countedQuantity,
          reservedQuantity: stock.reservedQuantity,
        },
        actorUserId: actor.id,
        reason: parsed.data.reason,
        sourceType: "STOCK_COUNT_SESSION",
        sourceId: session.id,
        idempotencyKey: `stock-count:${session.id}:APPLY`,
        metadata: {
          countNumber: session.countNumber,
          expectedQuantity: stock.quantity,
          countedQuantity: parsed.data.countedQuantity,
        },
      });
      if (!movement) throw new Error("COUNT_MOVEMENT_INTEGRITY");

      const sessionUpdate = await tx.stockCountSession.updateMany({
        where: { id: session.id, status: "OPEN", updatedAt: session.updatedAt },
        data: {
          status: "APPLIED",
          countedQuantity: parsed.data.countedQuantity,
          differenceQuantity,
          submittedById: actor.id,
          movementId: movement.id,
          submissionIdempotencyKey: parsed.data.idempotencyKey,
          submissionPayloadHash: payloadHash,
          submissionReason: parsed.data.reason,
          submittedAt,
        },
      });
      if (sessionUpdate.count !== 1) throw new Error("COUNT_SESSION_CLOSED");

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "stock_count.applied",
          entityType: "StockCountSession",
          entityId: session.id,
          metadata: JSON.stringify({
            countNumber: session.countNumber,
            productId: session.productId,
            productCode: session.productCode,
            warehouseCode: session.warehouseCode,
            expectedQuantity: stock.quantity,
            countedQuantity: parsed.data.countedQuantity,
            differenceQuantity,
            reservedQuantity: stock.reservedQuantity,
            reason: parsed.data.reason,
            movementId: movement.id,
          }),
        },
      });
      return {
        replay: false,
        countNumber: session.countNumber,
        productId: session.productId,
        applied: true,
        staleCode: null,
      };
    });

    revalidateStockCountPaths(result.productId);
    return {
      ok: result.applied,
      message: result.applied
        ? result.replay
          ? "Bu sayım daha önce tamamlanmış; stok ikinci kez değiştirilmedi."
          : "Sayım tamamlandı. Fiziksel stok ve hareket defteri birlikte güncellendi."
        : result.staleCode === "COUNT_BELOW_RESERVED"
          ? "Sayım sonucu kaydedildi ancak rezerve miktarın altında olduğu için stoğa uygulanmadı. Açık siparişleri inceleyin."
          : "Sayım sonucu kaydedildi ancak oturum açıldıktan sonra stok değiştiği için uygulanmadı. Güncel bakiye ile yeni sayım başlatın.",
      countNumber: result.countNumber,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentReplay = await resolveCompletionReplay(
        parsed.data.idempotencyKey,
        payloadHash,
      );
      if (concurrentReplay) return concurrentReplay;
    }
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        COUNT_COMPLETE_IDEMPOTENCY_CONFLICT:
          "Bu işlem anahtarı farklı bir sayım sonucu için kullanılmış. Sayfayı yenileyip yeniden deneyin.",
        COUNT_SESSION_NOT_FOUND: "Sayım oturumu bulunamadı.",
        COUNT_SESSION_CLOSED:
          "Bu sayım başka bir işlem tarafından tamamlanmış veya iptal edilmiş.",
        COUNT_STALE_BALANCE:
          "Stok bakiyesi işlem sırasında değişti. Sonuç uygulanmadı; aynı formu tekrar gönderebilirsiniz.",
        COUNT_MOVEMENT_INTEGRITY:
          "Sayım hareketi doğrulanamadı. Hiçbir stok bakiyesi değiştirilmedi.",
      };
      if (messages[error.message]) return failure(messages[error.message]);
    }
    if (databaseBusy(error)) {
      return failure(
        "Stok sistemi şu anda başka bir işlem yürütüyor. Aynı formu tekrar gönderebilirsiniz.",
      );
    }
    return failure(
      "Sayım tamamlanamadı. Stok bakiyesi ve sayım oturumu değiştirilmedi.",
    );
  }
}

export async function cancelStockCount(
  input: ActionInput,
  maybeFormData?: FormData,
): Promise<StockCountActionState> {
  const actor = await requirePermissionUser(
    "stock.count",
    "/admin/stok/sayimlar",
  );
  const formData = resolveFormData(input, maybeFormData);
  if (!formData) return failure("Sayım iptal formu alınamadı.");
  const parsed = cancelStockCountSchema.safeParse({
    sessionId: formData.get("sessionId"),
    reason: formData.get("reason"),
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "İptal bilgileri geçersiz.");
  }
  const payloadHash = getStockCountPayloadHash(
    "CANCEL",
    {
      sessionId: parsed.data.sessionId,
      reason: parsed.data.reason,
    },
    actor.id,
  );
  const replay = await resolveCancellationReplay(
    parsed.data.idempotencyKey,
    payloadHash,
  );
  if (replay) return replay;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await acquireStockMutationLock(tx);
      const existingReplay = await tx.stockCountSession.findUnique({
        where: { cancellationIdempotencyKey: parsed.data.idempotencyKey },
        select: {
          countNumber: true,
          cancellationPayloadHash: true,
          productId: true,
        },
      });
      if (existingReplay) {
        if (existingReplay.cancellationPayloadHash !== payloadHash) {
          throw new Error("COUNT_CANCEL_IDEMPOTENCY_CONFLICT");
        }
        return {
          replay: true,
          countNumber: existingReplay.countNumber,
          productId: existingReplay.productId,
        };
      }

      const session = await tx.stockCountSession.findUnique({
        where: { id: parsed.data.sessionId },
      });
      if (!session) throw new Error("COUNT_SESSION_NOT_FOUND");
      if (session.status !== "OPEN") throw new Error("COUNT_SESSION_CLOSED");

      const cancelledAt = new Date();
      const sessionUpdate = await tx.stockCountSession.updateMany({
        where: { id: session.id, status: "OPEN", updatedAt: session.updatedAt },
        data: {
          status: "CANCELLED",
          cancelledById: actor.id,
          cancellationIdempotencyKey: parsed.data.idempotencyKey,
          cancellationPayloadHash: payloadHash,
          cancellationReason: parsed.data.reason,
          cancelledAt,
        },
      });
      if (sessionUpdate.count !== 1) throw new Error("COUNT_SESSION_CLOSED");
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "stock_count.cancelled",
          entityType: "StockCountSession",
          entityId: session.id,
          metadata: JSON.stringify({
            countNumber: session.countNumber,
            productId: session.productId,
            productCode: session.productCode,
            warehouseCode: session.warehouseCode,
            reason: parsed.data.reason,
          }),
        },
      });
      return {
        replay: false,
        countNumber: session.countNumber,
        productId: session.productId,
      };
    });

    revalidateStockCountPaths(result.productId);
    return {
      ok: true,
      message: result.replay
        ? "Bu sayım daha önce iptal edilmiş; ikinci bir işlem yapılmadı."
        : "Sayım iptal edildi. Stok bakiyesi değiştirilmedi.",
      countNumber: result.countNumber,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentReplay = await resolveCancellationReplay(
        parsed.data.idempotencyKey,
        payloadHash,
      );
      if (concurrentReplay) return concurrentReplay;
    }
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        COUNT_CANCEL_IDEMPOTENCY_CONFLICT:
          "Bu işlem anahtarı farklı bir sayım iptali için kullanılmış. Sayfayı yenileyip yeniden deneyin.",
        COUNT_SESSION_NOT_FOUND: "Sayım oturumu bulunamadı.",
        COUNT_SESSION_CLOSED:
          "Bu sayım başka bir işlem tarafından tamamlanmış veya iptal edilmiş.",
      };
      if (messages[error.message]) return failure(messages[error.message]);
    }
    if (databaseBusy(error)) {
      return failure(
        "Stok sistemi şu anda başka bir işlem yürütüyor. Aynı formu tekrar gönderebilirsiniz.",
      );
    }
    return failure("Sayım iptal edilemedi. Stok bakiyesi değiştirilmedi.");
  }
}
