"use server";

import { randomBytes } from "crypto";

import {
  categoryFormSchema,
  mediaAssetFormSchema,
  mediaAssetStatusFormSchema,
  priceListFormSchema,
  productCompatibilityDeleteFormSchema,
  productCompatibilityFormSchema,
  productFormSchema,
  productPublicationSchema,
  productPriceFormSchema,
  stockFormSchema,
  stockAdjustmentFormSchema,
} from "@/domain/validation";
import { getProductPublicationReadiness } from "@/domain/catalog";
import { recordStockMovement } from "@/domain/stock-movement";
import { Prisma } from "@/generated/prisma/client";
import { requirePermissionUser } from "@/lib/auth";
import { revalidatePathsBestEffort } from "@/lib/cache-revalidation";
import { getCorrelationId, structuredLog } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

export type CatalogActionState = {
  ok: boolean;
  message: string;
};

type CatalogActionInput = FormData | CatalogActionState;

const success = (message: string): CatalogActionState => ({ ok: true, message });
const failure = (message: string): CatalogActionState => ({ ok: false, message });
class CatalogMutationConflictError extends Error {}

function resolveFormData(input: CatalogActionInput, maybeFormData?: FormData) {
  return input instanceof FormData ? input : maybeFormData;
}

function getFirstValidationMessage(errorMessage: string) {
  return errorMessage || "Form bilgileri geçersiz.";
}

function mapCatalogMutationError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Benzersiz olması gereken bir alan zaten kullanılıyor. Kod, slug, fiyat kademesi veya depo kodunu kontrol edin.";
    }

    if (error.code === "P2003" && error.meta?.modelName !== "AuditLog") {
      return "Seçilen ilişkili kayıt bulunamadı. Kategori, fiyat listesi veya ürün seçimini kontrol edin.";
    }

    if (
      error.code === "P2004" ||
      error.code === "SQLITE_CONSTRAINT_CHECK"
    ) {
      return "Stok miktarı rezerve miktarın altına indirilemez.";
    }
  }

  const correlationId = getCorrelationId();
  structuredLog("error", "catalog.mutation.failed", { correlationId, error });
  return `Kayıt sırasında beklenmeyen bir hata oluştu. Destek kodu: ${correlationId}`;
}

async function writeAuditLog(userId: string, action: string, entityType: string, entityId?: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}

function nullable<T>(value: T | undefined) {
  return value ?? null;
}

function normalizeMediaKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeCompatibilityKeyPart(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCompatibilityDuplicateKey(input: {
  vehicleBrand: string;
  vehicleModel: string;
  yearStart?: number | null;
  yearEnd?: number | null;
  oemReference?: string | null;
}) {
  return [
    normalizeCompatibilityKeyPart(input.vehicleBrand),
    normalizeCompatibilityKeyPart(input.vehicleModel),
    input.yearStart ?? "",
    input.yearEnd ?? "",
    normalizeCompatibilityKeyPart(input.oemReference),
  ].join("|");
}

function revalidateProductSurfaces(productId?: string) {
  revalidatePathsBestEffort(
    ["/", "/admin/urunler", "/urunler", "/bayi/urunler", ...(productId ? [`/admin/urunler/${productId}`] : [])],
    "catalog.cache_revalidation_failed",
    { productId },
  );
}

export async function setProductPublicationStatus(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requirePermissionUser("product.manage", "/admin/urunler");
  const formData = resolveFormData(input, maybeFormData);
  if (!formData) return failure("Form verisi alınamadı.");

  const parsed = productPublicationSchema.safeParse({
    productId: formData.get("productId"),
    targetStatus: formData.get("targetStatus"),
  });
  if (!parsed.success) return failure(getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: parsed.data.productId },
        select: {
          id: true,
          code: true,
          status: true,
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
          stockItems: { select: { quantity: true, reservedQuantity: true } },
        },
      });
      if (!product) return { state: failure("Ürün bulunamadı.") };

      const expectedStatus = parsed.data.targetStatus === "ACTIVE" ? "DRAFT" : "ACTIVE";
      if (product.status !== expectedStatus) {
        return {
          state: failure(
            parsed.data.targetStatus === "ACTIVE"
              ? "Yalnızca taslak ürünler yayına alınabilir."
              : "Yalnızca yayındaki ürünler taslağa alınabilir.",
          ),
        };
      }

      if (parsed.data.targetStatus === "ACTIVE") {
        const readiness = getProductPublicationReadiness(product);
        const missing = [
          !readiness.hasGeneralPrice && "1 adet için aktif standart bayi fiyatı",
          readiness.availableStock <= 0 && "kullanılabilir stok",
        ].filter(Boolean);
        if (missing.length > 0) {
          return { state: failure(`Ürün yayınlanamadı. Eksik: ${missing.join(" ve ")}.`) };
        }
      }

      const updated = await tx.product.updateMany({
        where: { id: product.id, status: product.status },
        data: { status: parsed.data.targetStatus },
      });
      if (updated.count !== 1) {
        throw new Error("Ürün işlem sırasında değişti. Listeyi yenileyip tekrar deneyin.");
      }
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: parsed.data.targetStatus === "ACTIVE" ? "product.published" : "product.unpublished",
          entityType: "Product",
          entityId: product.id,
          metadata: JSON.stringify({ code: product.code, previousStatus: product.status }),
        },
      });
      return {
        productId: product.id,
        state: success(parsed.data.targetStatus === "ACTIVE" ? "Ürün yayına alındı." : "Ürün taslağa alındı."),
      };
    });
    if (result.productId) revalidateProductSurfaces(result.productId);
    return result.state;
  } catch (error) {
    return failure(
      error instanceof Error && error.message.startsWith("Ürün işlem sırasında değişti")
        ? error.message
        : "Yayın durumu güncellenemedi.",
    );
  }
}

export async function saveCategory(input: CatalogActionInput, maybeFormData?: FormData): Promise<CatalogActionState> {
  const user = await requirePermissionUser("product.manage", "/admin/urunler");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }
  const parsed = categoryFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    description: formData.get("description") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
  });

  if (!parsed.success) {
    return failure(getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }

  try {
    const category = parsed.data.id
      ? await prisma.productCategory.update({
          where: { id: parsed.data.id },
          data: {
            name: parsed.data.name,
            slug: parsed.data.slug,
            description: nullable(parsed.data.description),
            sortOrder: parsed.data.sortOrder,
          },
        })
      : await prisma.productCategory.create({
          data: {
            name: parsed.data.name,
            slug: parsed.data.slug,
            description: nullable(parsed.data.description),
            sortOrder: parsed.data.sortOrder,
          },
        });

    await writeAuditLog(user.id, parsed.data.id ? "category.update" : "category.create", "ProductCategory", category.id, {
      slug: category.slug,
    });
    revalidatePathsBestEffort(
      ["/admin/urunler", "/urunler", "/bayi/urunler"],
      "catalog.category_cache_revalidation_failed",
      { categoryId: category.id },
    );

    return success(parsed.data.id ? "Kategori güncellendi." : "Kategori oluşturuldu.");
  } catch (error) {
    return failure(mapCatalogMutationError(error));
  }
}

export async function savePriceList(input: CatalogActionInput, maybeFormData?: FormData): Promise<CatalogActionState> {
  const user = await requirePermissionUser("price.manage", "/admin/urunler");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }

  const parsed = priceListFormSchema.safeParse({
    id: formData.get("id") || undefined,
    expectedUpdatedAt: formData.get("expectedUpdatedAt") || undefined,
    name: formData.get("name"),
    currency: formData.get("currency"),
    scope: formData.get("scope") || "PUBLIC",
    customerGroupId: formData.get("customerGroupId") || undefined,
    companyId: formData.get("companyId") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
    priority: formData.get("priority") || 0,
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    return failure(getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }

  try {
    const scopedData = {
      name: parsed.data.name,
      currency: parsed.data.currency,
      customerGroupId: parsed.data.scope === "CUSTOMER_GROUP" ? parsed.data.customerGroupId : null,
      companyId: parsed.data.scope === "COMPANY" ? parsed.data.companyId : null,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date(),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      priority: parsed.data.priority,
      isActive: parsed.data.isActive,
    };
    const priceList = await prisma.$transaction(async (tx) => {
      const previous = parsed.data.id
        ? await tx.priceList.findUnique({
            where: { id: parsed.data.id },
            include: { _count: { select: { prices: true } } },
          })
        : null;
      let saved;
      if (parsed.data.id) {
        const expectedUpdatedAt = new Date(parsed.data.expectedUpdatedAt!);
        if (!previous || previous.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
          throw new CatalogMutationConflictError("Fiyat listesi başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
        }
        if (
          previous._count.prices > 0 &&
          (previous.currency !== scopedData.currency ||
            previous.companyId !== scopedData.companyId ||
            previous.customerGroupId !== scopedData.customerGroupId)
        ) {
          throw new CatalogMutationConflictError(
            "Fiyat satırı bulunan listenin para birimi veya kapsamı değiştirilemez. Yeni bir fiyat listesi oluşturun.",
          );
        }
        const updated = await tx.priceList.updateMany({
          where: { id: parsed.data.id, updatedAt: expectedUpdatedAt },
          data: scopedData,
        });
        if (updated.count !== 1) {
          throw new CatalogMutationConflictError("Fiyat listesi başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
        }
        saved = await tx.priceList.findUniqueOrThrow({ where: { id: parsed.data.id } });
      } else {
        saved = await tx.priceList.create({ data: scopedData });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: parsed.data.id ? "price_list.update" : "price_list.create",
          entityType: "PriceList",
          entityId: saved.id,
          metadata: JSON.stringify({
            previous: previous
              ? {
                  name: previous.name,
                  currency: previous.currency,
                  companyId: previous.companyId,
                  customerGroupId: previous.customerGroupId,
                  startsAt: previous.startsAt.toISOString(),
                  endsAt: previous.endsAt?.toISOString() ?? null,
                  priority: previous.priority,
                  isActive: previous.isActive,
                }
              : null,
            next: {
              name: saved.name,
              currency: saved.currency,
              companyId: saved.companyId,
              customerGroupId: saved.customerGroupId,
              startsAt: saved.startsAt.toISOString(),
              endsAt: saved.endsAt?.toISOString() ?? null,
              priority: saved.priority,
              isActive: saved.isActive,
            },
          }),
        },
      });
      return saved;
    });
    revalidatePathsBestEffort(
      ["/admin/urunler", "/urunler", "/bayi/urunler"],
      "catalog.price_list_cache_revalidation_failed",
      { priceListId: priceList.id },
    );

    return success(parsed.data.id ? "Fiyat listesi güncellendi." : "Fiyat listesi oluşturuldu.");
  } catch (error) {
    if (error instanceof CatalogMutationConflictError) return failure(error.message);
    return failure(mapCatalogMutationError(error));
  }
}

export async function saveProductBundle(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requirePermissionUser("product.manage", "/admin/urunler");
  await requirePermissionUser("stock.manage", "/admin/urunler");
  await requirePermissionUser("price.manage", "/admin/urunler");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }
  const bundleIdempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (bundleIdempotencyKey.length < 16) return failure("Ürün işlem anahtarı geçersizdir.");

  const productParsed = productFormSchema.safeParse({
    id: formData.get("id") || undefined,
    code: formData.get("code"),
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    vehicleBrand: formData.get("vehicleBrand") || undefined,
    vehicleModel: formData.get("vehicleModel") || undefined,
    yearStart: formData.get("yearStart") || undefined,
    yearEnd: formData.get("yearEnd") || undefined,
    glassPosition: formData.get("glassPosition") || undefined,
    glassType: formData.get("glassType"),
    dimensions: formData.get("dimensions") || undefined,
    thicknessMm: formData.get("thicknessMm") || undefined,
    tint: formData.get("tint") || undefined,
    isTempered: formData.get("isTempered"),
    isLaminated: formData.get("isLaminated"),
    processingNotes: formData.get("processingNotes") || undefined,
    compatibilityNotes: formData.get("compatibilityNotes") || undefined,
    orderMode: "ORDER_ONLY",
    status: formData.get("status"),
  });

  const stockParsed = stockFormSchema.safeParse({
    warehouseCode: formData.get("warehouseCode"),
    quantity: formData.get("quantity") || 0,
    reservedQuantity: 0,
    visibility: formData.get("visibility"),
    status: formData.get("stockStatus"),
  });

  const priceParsed = productPriceFormSchema.safeParse({
    priceListId: formData.get("priceListId"),
    amount: formData.get("amount"),
    minQuantity: formData.get("minQuantity") || 1,
  });

  if (!productParsed.success) {
    return failure(getFirstValidationMessage(productParsed.error.issues[0]?.message ?? ""));
  }

  if (!stockParsed.success) {
    return failure(getFirstValidationMessage(stockParsed.error.issues[0]?.message ?? ""));
  }

  if (!priceParsed.success) {
    return failure(getFirstValidationMessage(priceParsed.error.issues[0]?.message ?? ""));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productData = {
        code: productParsed.data.code,
        name: productParsed.data.name,
        categoryId: productParsed.data.categoryId,
        vehicleBrand: nullable(productParsed.data.vehicleBrand),
        vehicleModel: nullable(productParsed.data.vehicleModel),
        yearStart: nullable(productParsed.data.yearStart),
        yearEnd: nullable(productParsed.data.yearEnd),
        glassPosition: nullable(productParsed.data.glassPosition),
        glassType: productParsed.data.glassType,
        dimensions: nullable(productParsed.data.dimensions),
        thicknessMm: nullable(productParsed.data.thicknessMm),
        tint: nullable(productParsed.data.tint),
        isTempered: productParsed.data.isTempered,
        isLaminated: productParsed.data.isLaminated,
        isCustomAvailable: false,
        processingNotes: nullable(productParsed.data.processingNotes),
        compatibilityNotes: nullable(productParsed.data.compatibilityNotes),
        orderMode: "ORDER_ONLY",
        status: productParsed.data.status,
      };

      const product = productParsed.data.id
        ? await tx.product.update({ where: { id: productParsed.data.id }, data: productData })
        : await tx.product.create({ data: productData });

      const currentStock = await tx.stockItem.findUnique({
        where: {
          productId_warehouseCode: {
            productId: product.id,
            warehouseCode: stockParsed.data.warehouseCode,
          },
        },
      });
      const stock = await tx.stockItem.upsert({
        where: {
          productId_warehouseCode: {
            productId: product.id,
            warehouseCode: stockParsed.data.warehouseCode,
          },
        },
        update: {
          quantity: stockParsed.data.quantity,
          visibility: stockParsed.data.visibility,
          status: stockParsed.data.status,
        },
        create: {
          productId: product.id,
          warehouseCode: stockParsed.data.warehouseCode,
          quantity: stockParsed.data.quantity,
          reservedQuantity: 0,
          visibility: stockParsed.data.visibility,
          status: stockParsed.data.status,
        },
      });
      await recordStockMovement(tx, {
        stockItemId: stock.id,
        productId: product.id,
        productCode: product.code,
        warehouseCode: stock.warehouseCode,
        movementType: currentStock ? "MANUAL_ADJUSTMENT" : "INITIAL_STOCK",
        before: {
          quantity: currentStock?.quantity ?? 0,
          reservedQuantity: currentStock?.reservedQuantity ?? 0,
        },
        after: { quantity: stock.quantity, reservedQuantity: stock.reservedQuantity },
        actorUserId: user.id,
        reason: currentStock ? "Ürün paket kaydında stok düzeltmesi." : "Yeni ürün ilk stok bakiyesi.",
        sourceType: "PRODUCT_BUNDLE",
        sourceId: product.id,
        idempotencyKey: `product-bundle:${bundleIdempotencyKey}:${stock.id}`,
      });

      await tx.productPrice.upsert({
        where: {
          productId_priceListId_minQuantity: {
            productId: product.id,
            priceListId: priceParsed.data.priceListId,
            minQuantity: priceParsed.data.minQuantity,
          },
        },
        update: {
          amount: priceParsed.data.amount,
        },
        create: {
          productId: product.id,
          priceListId: priceParsed.data.priceListId,
          amount: priceParsed.data.amount,
          minQuantity: priceParsed.data.minQuantity,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: productParsed.data.id ? "product.update_bundle" : "product.create_bundle",
          entityType: "Product",
          entityId: product.id,
          metadata: JSON.stringify({ code: product.code, stockItemId: stock.id }),
        },
      });

      return product;
    });
    revalidateProductSurfaces(result.id);

    return success(productParsed.data.id ? "Ürün güncellendi." : "Ürün, stok ve fiyat kaydı oluşturuldu.");
  } catch (error) {
    return failure(mapCatalogMutationError(error));
  }
}

export async function saveProductStock(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requirePermissionUser("stock.manage", "/admin/urunler");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }

  const parsed = stockAdjustmentFormSchema.safeParse({
    productId: formData.get("productId"),
    warehouseCode: formData.get("warehouseCode"),
    quantity: formData.get("quantity") || 0,
    reservedQuantity: 0,
    visibility: formData.get("visibility"),
    status: formData.get("status"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt") || undefined,
    idempotencyKey: formData.get("idempotencyKey"),
    reason: formData.get("reason"),
  });

  if (!parsed.success || !parsed.data.productId) {
    return failure(parsed.success ? "Ürün seçimi zorunludur." : getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const replay = await tx.stockMovement.findUnique({
        where: { idempotencyKey: `manual:${parsed.data.idempotencyKey}` },
        select: { id: true },
      });
      if (replay) return { replay: true };

      const product = await tx.product.findUnique({
        where: { id: parsed.data.productId },
        select: { id: true, code: true },
      });
      if (!product) throw new Error("STOCK_PRODUCT_NOT_FOUND");
      const current = await tx.stockItem.findUnique({
        where: {
          productId_warehouseCode: {
            productId: product.id,
            warehouseCode: parsed.data.warehouseCode,
          },
        },
      });
      if (current && (!parsed.data.expectedUpdatedAt || current.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt)) {
        throw new Error("STOCK_STALE_BALANCE");
      }
      if (!current && parsed.data.expectedUpdatedAt) throw new Error("STOCK_STALE_BALANCE");

      const before = {
        quantity: current?.quantity ?? 0,
        reservedQuantity: current?.reservedQuantity ?? 0,
      };
      if (parsed.data.quantity < before.reservedQuantity) throw new Error("STOCK_BELOW_RESERVED");
      const stock = current
        ? await tx.stockItem.update({
            where: { id: current.id },
            data: {
              quantity: parsed.data.quantity,
              visibility: parsed.data.visibility,
              status: parsed.data.status,
            },
          })
        : await tx.stockItem.create({
            data: {
              productId: product.id,
              warehouseCode: parsed.data.warehouseCode,
              quantity: parsed.data.quantity,
              reservedQuantity: 0,
              visibility: parsed.data.visibility,
              status: parsed.data.status,
            },
          });
      await recordStockMovement(tx, {
        stockItemId: stock.id,
        productId: product.id,
        productCode: product.code,
        warehouseCode: stock.warehouseCode,
        movementType: "MANUAL_ADJUSTMENT",
        before,
        after: { quantity: stock.quantity, reservedQuantity: stock.reservedQuantity },
        actorUserId: user.id,
        reason: parsed.data.reason,
        sourceType: "MANUAL",
        sourceId: parsed.data.idempotencyKey,
        idempotencyKey: `manual:${parsed.data.idempotencyKey}`,
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "stock.adjusted",
          entityType: "StockItem",
          entityId: stock.id,
          metadata: JSON.stringify({
            productId: product.id,
            warehouseCode: stock.warehouseCode,
            beforeQuantity: before.quantity,
            afterQuantity: stock.quantity,
            reason: parsed.data.reason,
          }),
        },
      });
      return { replay: false };
    });
    revalidateProductSurfaces(parsed.data.productId);

    return success(result.replay ? "Bu stok düzeltmesi daha önce uygulanmış." : "Stok güncellendi ve hareket defterine kaydedildi.");
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK_STALE_BALANCE") {
      return failure("Stok bakiyesi başka bir işlem tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.");
    }
    if (error instanceof Error && error.message === "STOCK_BELOW_RESERVED") {
      return failure("Fiziksel stok rezerve miktarın altına indirilemez.");
    }
    return failure(mapCatalogMutationError(error));
  }
}

export async function saveProductPrice(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requirePermissionUser("price.manage", "/admin/urunler");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }

  const parsed = productPriceFormSchema.safeParse({
    id: formData.get("id") || undefined,
    expectedUpdatedAt: formData.get("expectedUpdatedAt") || undefined,
    productId: formData.get("productId"),
    priceListId: formData.get("priceListId"),
    amount: formData.get("amount"),
    minQuantity: formData.get("minQuantity") || 1,
  });

  if (!parsed.success || !parsed.data.productId) {
    return failure(parsed.success ? "Ürün seçimi zorunludur." : getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }
  const productId = parsed.data.productId;

  try {
    await prisma.$transaction(async (tx) => {
      const compoundKey = {
        productId,
        priceListId: parsed.data.priceListId,
        minQuantity: parsed.data.minQuantity,
      };
      let previous = null;
      let price;
      if (parsed.data.id) {
        previous = await tx.productPrice.findUnique({ where: { id: parsed.data.id } });
        const expectedUpdatedAt = new Date(parsed.data.expectedUpdatedAt!);
        if (
          !previous ||
          previous.productId !== productId ||
          previous.priceListId !== parsed.data.priceListId ||
          previous.minQuantity !== parsed.data.minQuantity ||
          previous.updatedAt.getTime() !== expectedUpdatedAt.getTime()
        ) {
          throw new CatalogMutationConflictError("Ürün fiyatı başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
        }
        const updated = await tx.productPrice.updateMany({
          where: { id: parsed.data.id, updatedAt: expectedUpdatedAt },
          data: { amount: parsed.data.amount },
        });
        if (updated.count !== 1) {
          throw new CatalogMutationConflictError("Ürün fiyatı başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.");
        }
        price = await tx.productPrice.findUniqueOrThrow({ where: { id: parsed.data.id } });
      } else {
        price = await tx.productPrice.create({ data: { ...compoundKey, amount: parsed.data.amount } });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: previous ? "product_price.update" : "product_price.create",
          entityType: "ProductPrice",
          entityId: price.id,
          metadata: JSON.stringify({
            productId,
            priceListId: parsed.data.priceListId,
            minQuantity: parsed.data.minQuantity,
            previousAmount: previous?.amount.toString() ?? null,
            amount: price.amount.toString(),
          }),
        },
      });
    });
    revalidateProductSurfaces(productId);

    return success("Fiyat güncellendi.");
  } catch (error) {
    if (error instanceof CatalogMutationConflictError) return failure(error.message);
    return failure(mapCatalogMutationError(error));
  }
}

export async function saveProductCompatibility(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requirePermissionUser("product.manage", "/admin/urunler");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alinamadi.");
  }

  const parsed = productCompatibilityFormSchema.safeParse({
    id: formData.get("id") || undefined,
    productId: formData.get("productId"),
    vehicleBrand: formData.get("vehicleBrand"),
    vehicleModel: formData.get("vehicleModel"),
    yearStart: formData.get("yearStart") || undefined,
    yearEnd: formData.get("yearEnd") || undefined,
    oemReference: formData.get("oemReference") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return failure(getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }

  try {
    if (parsed.data.id) {
      const existing = await prisma.productCompatibility.findFirst({
        where: { id: parsed.data.id, productId: parsed.data.productId },
        select: { id: true },
      });

      if (!existing) {
        return failure("Uyumluluk kaydi bu urune ait degil veya bulunamadi.");
      }
    }

    const duplicateKey = getCompatibilityDuplicateKey(parsed.data);
    const existingCompatibilities = await prisma.productCompatibility.findMany({
      where: { productId: parsed.data.productId },
      select: {
        id: true,
        vehicleBrand: true,
        vehicleModel: true,
        yearStart: true,
        yearEnd: true,
        oemReference: true,
      },
    });
    const duplicate = existingCompatibilities.find(
      (compatibility) =>
        compatibility.id !== parsed.data.id && getCompatibilityDuplicateKey(compatibility) === duplicateKey,
    );

    if (duplicate) {
      return failure("Ayni marka/model/yil/OEM kombinasyonu bu urunde zaten kayitli.");
    }

    const compatibility = parsed.data.id
      ? await prisma.productCompatibility.update({
          where: { id: parsed.data.id },
          data: {
            vehicleBrand: parsed.data.vehicleBrand,
            vehicleModel: parsed.data.vehicleModel,
            yearStart: nullable(parsed.data.yearStart),
            yearEnd: nullable(parsed.data.yearEnd),
            oemReference: nullable(parsed.data.oemReference),
            notes: nullable(parsed.data.notes),
          },
        })
      : await prisma.productCompatibility.create({
          data: {
            productId: parsed.data.productId,
            vehicleBrand: parsed.data.vehicleBrand,
            vehicleModel: parsed.data.vehicleModel,
            yearStart: nullable(parsed.data.yearStart),
            yearEnd: nullable(parsed.data.yearEnd),
            oemReference: nullable(parsed.data.oemReference),
            notes: nullable(parsed.data.notes),
          },
        });

    await writeAuditLog(
      user.id,
      parsed.data.id ? "product_compatibility.update" : "product_compatibility.create",
      "Product",
      parsed.data.productId,
      {
        compatibilityId: compatibility.id,
        vehicleBrand: compatibility.vehicleBrand,
        vehicleModel: compatibility.vehicleModel,
        oemReference: compatibility.oemReference,
      },
    );
    revalidateProductSurfaces(parsed.data.productId);

    return success(parsed.data.id ? "Uyumluluk kaydi guncellendi." : "Uyumluluk kaydi eklendi.");
  } catch (error) {
    return failure(mapCatalogMutationError(error));
  }
}

export async function deleteProductCompatibility(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requirePermissionUser("product.manage", "/admin/urunler");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alinamadi.");
  }

  const parsed = productCompatibilityDeleteFormSchema.safeParse({
    id: formData.get("id"),
    productId: formData.get("productId"),
  });

  if (!parsed.success) {
    return failure(getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }

  try {
    const existing = await prisma.productCompatibility.findFirst({
      where: { id: parsed.data.id, productId: parsed.data.productId },
      select: {
        id: true,
        vehicleBrand: true,
        vehicleModel: true,
        yearStart: true,
        yearEnd: true,
        oemReference: true,
      },
    });

    if (!existing) {
      return failure("Uyumluluk kaydi bu urune ait degil veya bulunamadi.");
    }

    await prisma.productCompatibility.delete({ where: { id: parsed.data.id } });
    await writeAuditLog(user.id, "product_compatibility.delete", "Product", parsed.data.productId, {
      compatibilityId: existing.id,
      vehicleBrand: existing.vehicleBrand,
      vehicleModel: existing.vehicleModel,
      yearStart: existing.yearStart,
      yearEnd: existing.yearEnd,
      oemReference: existing.oemReference,
    });
    revalidateProductSurfaces(parsed.data.productId);

    return success("Uyumluluk kaydi silindi.");
  } catch (error) {
    return failure(mapCatalogMutationError(error));
  }
}

export async function saveProductMedia(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requirePermissionUser("product.manage", "/admin/urunler");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alinamadi.");
  }

  const parsed = mediaAssetFormSchema.safeParse({
    id: formData.get("id") || undefined,
    productId: formData.get("productId"),
    key: formData.get("key") || undefined,
    title: formData.get("title"),
    url: formData.get("url"),
    altText: formData.get("altText"),
    usage: formData.get("usage"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    return failure(getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }

  const fallbackKey = `product-${parsed.data.productId}-${normalizeMediaKey(parsed.data.title) || "media"}-${randomBytes(4).toString("hex")}`;
  const normalizedKey = parsed.data.key ? normalizeMediaKey(parsed.data.key) : "";
  const key = normalizedKey || fallbackKey;

  try {
    if (parsed.data.id) {
      const existing = await prisma.mediaAsset.findFirst({
        where: { id: parsed.data.id, productId: parsed.data.productId },
        select: { id: true },
      });

      if (!existing) {
        return failure("Medya kaydi bu urune ait degil veya bulunamadi.");
      }
    }

    const mediaAsset = parsed.data.id
      ? await prisma.mediaAsset.update({
          where: { id: parsed.data.id },
          data: {
            key,
            title: parsed.data.title,
            url: parsed.data.url,
            altText: parsed.data.altText,
            usage: parsed.data.usage,
            isActive: parsed.data.isActive,
            productId: parsed.data.productId,
          },
        })
      : await prisma.mediaAsset.create({
          data: {
            key,
            title: parsed.data.title,
            url: parsed.data.url,
            altText: parsed.data.altText,
            usage: parsed.data.usage,
            isActive: parsed.data.isActive,
            productId: parsed.data.productId,
          },
        });

    await writeAuditLog(user.id, parsed.data.id ? "media_asset.update" : "media_asset.create", "Product", parsed.data.productId, {
      mediaAssetId: mediaAsset.id,
      key: mediaAsset.key,
      usage: mediaAsset.usage,
    });
    revalidateProductSurfaces(parsed.data.productId);

    return success(parsed.data.id ? "Medya kaydi guncellendi." : "Medya kaydi eklendi.");
  } catch (error) {
    return failure(mapCatalogMutationError(error));
  }
}

export async function setProductMediaStatus(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requirePermissionUser("product.manage", "/admin/urunler");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alinamadi.");
  }

  const parsed = mediaAssetStatusFormSchema.safeParse({
    id: formData.get("id"),
    productId: formData.get("productId"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    return failure(getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }

  try {
    const existing = await prisma.mediaAsset.findFirst({
      where: { id: parsed.data.id, productId: parsed.data.productId },
      select: { id: true, isActive: true, key: true, usage: true },
    });

    if (!existing) {
      return failure("Medya kaydi bu urune ait degil veya bulunamadi.");
    }

    const mediaAsset = await prisma.mediaAsset.update({
      where: { id: parsed.data.id },
      data: { isActive: parsed.data.isActive },
    });

    await writeAuditLog(
      user.id,
      parsed.data.isActive ? "media_asset.activate" : "media_asset.deactivate",
      "Product",
      parsed.data.productId,
      {
        mediaAssetId: mediaAsset.id,
        key: mediaAsset.key,
        usage: mediaAsset.usage,
        previousIsActive: existing.isActive,
      },
    );
    revalidateProductSurfaces(parsed.data.productId);

    return success(parsed.data.isActive ? "Medya kaydi aktif edildi." : "Medya kaydi pasife alindi.");
  } catch (error) {
    return failure(mapCatalogMutationError(error));
  }
}

export async function saveCategoryForm(formData: FormData) {
  await saveCategory(formData);
}

export async function savePriceListForm(formData: FormData) {
  await savePriceList(formData);
}

export async function saveProductBundleForm(formData: FormData) {
  await saveProductBundle(formData);
}

export async function saveProductStockForm(formData: FormData) {
  await saveProductStock(formData);
}

export async function saveProductPriceForm(formData: FormData) {
  await saveProductPrice(formData);
}

export async function saveProductCompatibilityForm(formData: FormData) {
  await saveProductCompatibility(formData);
}

export async function deleteProductCompatibilityForm(formData: FormData) {
  await deleteProductCompatibility(formData);
}

export async function saveProductMediaForm(formData: FormData) {
  await saveProductMedia(formData);
}

export async function setProductMediaStatusForm(formData: FormData) {
  await setProductMediaStatus(formData);
}
