import { createHash } from "node:crypto";

import { z } from "zod";

const reasonSchema = z
  .string()
  .trim()
  .min(10, "Operasyon gerekçesi en az 10 karakter olmalıdır.")
  .max(500, "Operasyon gerekçesi en fazla 500 karakter olabilir.");

export const openStockCountSchema = z.object({
  stockItemId: z.string().trim().min(1, "Sayılacak stok seçilmelidir."),
  idempotencyKey: z.string().uuid("Sayım işlem anahtarı geçersizdir."),
});

export const completeStockCountSchema = z.object({
  sessionId: z.string().trim().min(1, "Sayım oturumu bulunamadı."),
  countedQuantity: z.coerce
    .number()
    .int("Sayılan miktar tam sayı olmalıdır.")
    .min(0, "Sayılan miktar negatif olamaz.")
    .max(1_000_000, "Sayılan miktar 1.000.000 adedi aşamaz."),
  reason: reasonSchema,
  idempotencyKey: z.string().uuid("Sayım işlem anahtarı geçersizdir."),
});

export const cancelStockCountSchema = z.object({
  sessionId: z.string().trim().min(1, "Sayım oturumu bulunamadı."),
  reason: reasonSchema,
  idempotencyKey: z.string().uuid("İptal işlem anahtarı geçersizdir."),
});

type CountOperation = "OPEN" | "COMPLETE" | "CANCEL";

export function getStockCountPayloadHash(
  operation: CountOperation,
  payload: Record<string, string | number>,
  actorUserId: string,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        schemaVersion: 1,
        operation,
        actorUserId,
        ...payload,
      }),
    )
    .digest("hex");
}

export function getStockCountNumber(idempotencyKey: string) {
  return `SYM-${idempotencyKey.replaceAll("-", "").toUpperCase()}`;
}
