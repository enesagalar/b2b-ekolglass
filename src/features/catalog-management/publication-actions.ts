"use server";

import { randomBytes } from "crypto";

import { getProductPublicationReadiness } from "@/domain/catalog";
import { productBulkPublicationSchema } from "@/domain/validation";
import type { CatalogActionState } from "@/features/catalog-management/actions";
import { requirePermissionUser } from "@/lib/auth";
import { revalidatePathsBestEffort } from "@/lib/cache-revalidation";
import { prisma } from "@/lib/prisma";

const failure = (message: string): CatalogActionState => ({ ok: false, message });

export async function publishReadyProducts(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const user = await requirePermissionUser(
    "product.manage",
    "/admin/urunler/yayin-hazirligi",
  );
  const parsed = productBulkPublicationSchema.safeParse({
    productIds: formData.getAll("productIds"),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Ürün seçimi geçersizdir.");
  }

  const productIds = parsed.data.productIds;
  const batchId = randomBytes(12).toString("hex");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, status: "DRAFT" },
        select: {
          id: true,
          code: true,
          prices: {
            select: {
              amount: true,
              minQuantity: true,
              priceList: {
                select: {
                  companyId: true,
                  customerGroupId: true,
                  isActive: true,
                  startsAt: true,
                  endsAt: true,
                },
              },
            },
          },
          stockItems: {
            select: { quantity: true, reservedQuantity: true },
          },
        },
      });

      if (products.length !== productIds.length) {
        return failure(
          "Seçilen ürünlerden biri bulunamadı veya artık taslak değil. Listeyi yenileyip tekrar deneyin.",
        );
      }

      const unreadyProducts = products.filter(
        (product) => !getProductPublicationReadiness(product).isReady,
      );
      if (unreadyProducts.length > 0) {
        return failure(
          `Yayın koşulları değişen ürünler var: ${unreadyProducts
            .slice(0, 5)
            .map((product) => product.code)
            .join(", ")}. Hiçbir ürün yayınlanmadı.`,
        );
      }

      const updateResult = await tx.product.updateMany({
        where: { id: { in: productIds }, status: "DRAFT" },
        data: { status: "ACTIVE" },
      });
      if (updateResult.count !== productIds.length) {
        throw new Error("Ürünlerden biri işlem sırasında değişti. Hiçbir ürün yayınlanmadı.");
      }

      await tx.auditLog.createMany({
        data: products.map((product) => ({
          actorUserId: user.id,
          action: "product.published",
          entityType: "Product",
          entityId: product.id,
          metadata: JSON.stringify({
            batchId,
            code: product.code,
            previousStatus: "DRAFT",
            source: "bulk-publication-readiness",
          }),
        })),
      });

      return { ok: true as const, message: `${products.length} ürün yayına alındı.` };
    });

    if (!result.ok) return result;

    revalidatePathsBestEffort(
      ["/", "/urunler", "/bayi/urunler", "/admin/urunler", "/admin/urunler/yayin-hazirligi"],
      "catalog.publication_cache_revalidation_failed",
      { batchId },
    );

    return result;
  } catch (error) {
    return failure(
      error instanceof Error && error.message.startsWith("Ürünlerden biri işlem sırasında değişti")
        ? error.message
        : "Toplu yayın işlemi tamamlanamadı.",
    );
  }
}
