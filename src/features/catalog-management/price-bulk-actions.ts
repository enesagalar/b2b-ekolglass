"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { CatalogActionState } from "@/features/catalog-management/actions";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CatalogActionInput = FormData | CatalogActionState;

const adjustmentSchema = z.object({
  priceListId: z.string().trim().min(1),
  expectedUpdatedAt: z.string().datetime(),
  operation: z.enum(["INCREASE", "DECREASE"]),
  method: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().positive().max(1_000_000_000),
  reason: z.string().trim().min(10).max(500),
  confirmed: z.literal("on"),
});

function resolveFormData(input: CatalogActionInput, maybeFormData?: FormData) {
  return input instanceof FormData ? input : maybeFormData;
}

function formatValue(method: "PERCENT" | "FIXED", value: number) {
  return method === "PERCENT"
    ? `%${value.toLocaleString("tr-TR")}`
    : value.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

function adjustedAmount(
  amount: Prisma.Decimal,
  operation: "INCREASE" | "DECREASE",
  method: "PERCENT" | "FIXED",
  value: number,
) {
  const decimalValue = new Prisma.Decimal(value);
  const next =
    method === "PERCENT"
      ? amount.mul(
          operation === "INCREASE"
            ? new Prisma.Decimal(1).add(decimalValue.div(100))
            : new Prisma.Decimal(1).sub(decimalValue.div(100)),
        )
      : operation === "INCREASE"
        ? amount.add(decimalValue)
        : amount.sub(decimalValue);
  return next.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export async function bulkAdjustPrices(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const actor = await requirePermissionUser(
    "price.manage",
    "/admin/urunler/fiyat-listeleri",
  );
  const formData = resolveFormData(input, maybeFormData);
  if (!formData) return { ok: false, message: "Form verisi alınamadı." };

  const parsed = adjustmentSchema.safeParse({
    priceListId: formData.get("priceListId"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    operation: formData.get("operation"),
    method: formData.get("method"),
    value: formData.get("value"),
    reason: formData.get("reason"),
    confirmed: formData.get("confirmed"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.path[0] === "confirmed"
          ? "Toplu fiyat işlemini onaylamalısınız."
          : parsed.error.issues[0]?.message ?? "Toplu fiyat bilgileri geçersiz.",
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const priceList = await tx.priceList.findUnique({
          where: { id: parsed.data.priceListId },
          include: {
            prices: {
              orderBy: [{ productId: "asc" }, { minQuantity: "asc" }],
              include: { product: { select: { code: true } } },
            },
          },
        });
        if (!priceList) throw new Error("PRICE_LIST_NOT_FOUND");
        if (
          priceList.updatedAt.getTime() !==
          new Date(parsed.data.expectedUpdatedAt).getTime()
        ) {
          throw new Error("PRICE_LIST_STALE");
        }
        if (!priceList.prices.length) throw new Error("PRICE_LIST_EMPTY");
        if (priceList.prices.length > 5_000) throw new Error("PRICE_LIST_TOO_LARGE");
        if (
          parsed.data.method === "PERCENT" &&
          parsed.data.operation === "DECREASE" &&
          parsed.data.value >= 100
        ) {
          throw new Error("PRICE_NON_POSITIVE");
        }

        const changes = priceList.prices.map((price) => {
          const nextAmount = adjustedAmount(
            price.amount,
            parsed.data.operation,
            parsed.data.method,
            parsed.data.value,
          );
          if (nextAmount.lte(0) || nextAmount.gt(1_000_000_000)) {
            throw new Error("PRICE_NON_POSITIVE");
          }
          return { price, nextAmount };
        });

        for (const { price, nextAmount } of changes) {
          const updated = await tx.productPrice.updateMany({
            where: { id: price.id, updatedAt: price.updatedAt },
            data: { amount: nextAmount },
          });
          if (updated.count !== 1) throw new Error("PRICE_ROW_STALE");
        }

        const operationKey = [
          priceList.id,
          parsed.data.operation,
          parsed.data.method,
          parsed.data.value,
          parsed.data.reason,
          Date.now(),
        ].join(":");
        const batch = await tx.catalogImportBatch.create({
          data: {
            kind: "PRICE_ADJUSTMENT",
            status: "APPLIED",
            fileName: `${priceList.name} toplu fiyat güncellemesi`,
            fileHash: createHash("sha256").update(operationKey).digest("hex"),
            priceListId: priceList.id,
            createdById: actor.id,
            totalRows: changes.length,
            validRows: changes.length,
            invalidRows: 0,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            appliedAt: new Date(),
            rows: {
              create: changes.map(({ price, nextAmount }, index) => ({
                rowNumber: index + 1,
                productId: price.productId,
                productCode: price.product.code,
                netPrice: nextAmount,
                previousPrice: price.amount,
                minQuantity: price.minQuantity,
                expectedPriceUpdatedAt: price.updatedAt,
                status: "APPLIED",
              })),
            },
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: "product_price.bulk_adjust",
            entityType: "PriceList",
            entityId: batch.id,
            metadata: JSON.stringify({
              priceListName: priceList.name,
              operation: parsed.data.operation,
              method: parsed.data.method,
              value: parsed.data.value,
              reason: parsed.data.reason,
              affectedRows: changes.length,
              batchId: batch.id,
              beforeMin: Prisma.Decimal.min(
                ...changes.map(({ price }) => price.amount),
              ).toString(),
              beforeMax: Prisma.Decimal.max(
                ...changes.map(({ price }) => price.amount),
              ).toString(),
              afterMin: Prisma.Decimal.min(
                ...changes.map(({ nextAmount }) => nextAmount),
              ).toString(),
              afterMax: Prisma.Decimal.max(
                ...changes.map(({ nextAmount }) => nextAmount),
              ).toString(),
            }),
          },
        });
        return { count: changes.length, name: priceList.name };
      },
      { timeout: 60_000, maxWait: 10_000 },
    );

    [
      "/",
      "/urunler",
      "/sepet",
      "/admin/urunler",
      "/admin/urunler/fiyat-listeleri",
    ].forEach((path) => revalidatePath(path));

    const direction =
      parsed.data.operation === "INCREASE" ? "artırıldı" : "azaltıldı";
    return {
      ok: true,
      message: `${result.name}: ${result.count} fiyat satırı ${formatValue(
        parsed.data.method,
        parsed.data.value,
      )} ${direction}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UNKNOWN";
    const knownMessages: Record<string, string> = {
      PRICE_LIST_NOT_FOUND: "Fiyat listesi bulunamadı.",
      PRICE_LIST_STALE:
        "Fiyat listesi başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.",
      PRICE_LIST_EMPTY: "Bu listede güncellenecek fiyat satırı bulunmuyor.",
      PRICE_LIST_TOO_LARGE:
        "Tek işlemde en fazla 5.000 fiyat satırı güncellenebilir.",
      PRICE_NON_POSITIVE:
        "İşlem bazı fiyatları sıfır veya negatif yapacağı için uygulanmadı.",
      PRICE_ROW_STALE:
        "Bir fiyat satırı başka bir işlem tarafından değiştirildi; hiçbir fiyat güncellenmedi.",
    };
    return {
      ok: false,
      message:
        knownMessages[message] ??
        "Toplu fiyat işlemi uygulanamadı. Kayıtlar değiştirilmedi.",
    };
  }
}
