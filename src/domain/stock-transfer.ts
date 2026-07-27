import { createHash } from "node:crypto";

import { z } from "zod";

import { normalizeWarehouseCode } from "./warehouse";

export const stockTransferFormSchema = z
  .object({
    productId: z.string().trim().min(1, "Ürün seçilmelidir."),
    sourceWarehouseCode: z
      .string()
      .trim()
      .min(1, "Kaynak depo seçilmelidir.")
      .transform(normalizeWarehouseCode),
    destinationWarehouseCode: z
      .string()
      .trim()
      .min(1, "Hedef depo seçilmelidir.")
      .transform(normalizeWarehouseCode),
    quantity: z.coerce
      .number()
      .int("Transfer miktarı tam sayı olmalıdır.")
      .positive("Transfer miktarı en az 1 olmalıdır.")
      .max(100_000, "Tek transferde en fazla 100.000 adet taşınabilir."),
    reason: z
      .string()
      .trim()
      .min(10, "Transfer gerekçesi en az 10 karakter olmalıdır.")
      .max(500, "Transfer gerekçesi en fazla 500 karakter olabilir."),
    idempotencyKey: z.string().uuid("Transfer işlem anahtarı geçersizdir."),
  })
  .superRefine((value, context) => {
    if (value.sourceWarehouseCode === value.destinationWarehouseCode) {
      context.addIssue({
        code: "custom",
        path: ["destinationWarehouseCode"],
        message: "Kaynak ve hedef depo farklı olmalıdır.",
      });
    }
  });

export type StockTransferCommand = z.infer<typeof stockTransferFormSchema>;

export function getStockTransferPayloadHash(
  command: Omit<StockTransferCommand, "idempotencyKey">,
  actorUserId: string,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        schemaVersion: 1,
        actorUserId,
        productId: command.productId,
        sourceWarehouseCode: normalizeWarehouseCode(
          command.sourceWarehouseCode,
        ),
        destinationWarehouseCode: normalizeWarehouseCode(
          command.destinationWarehouseCode,
        ),
        quantity: command.quantity,
        reason: command.reason.trim(),
      }),
    )
    .digest("hex");
}

export function getStockTransferNumber(idempotencyKey: string) {
  return `TRF-${idempotencyKey.replaceAll("-", "").toUpperCase()}`;
}
