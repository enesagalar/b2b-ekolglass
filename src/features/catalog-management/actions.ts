"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import {
  categoryFormSchema,
  mediaAssetFormSchema,
  mediaAssetStatusFormSchema,
  priceListFormSchema,
  productCompatibilityDeleteFormSchema,
  productCompatibilityFormSchema,
  productFormSchema,
  productPriceFormSchema,
  stockFormSchema,
} from "@/domain/validation";
import { Prisma } from "@/generated/prisma/client";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CatalogActionState = {
  ok: boolean;
  message: string;
};

type CatalogActionInput = FormData | CatalogActionState;

const success = (message: string): CatalogActionState => ({ ok: true, message });
const failure = (message: string): CatalogActionState => ({ ok: false, message });

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

    if (error.code === "P2003") {
      return "Seçilen ilişkili kayıt bulunamadı. Kategori, fiyat listesi veya ürün seçimini kontrol edin.";
    }

    if (
      error.code === "P2004" ||
      error.code === "SQLITE_CONSTRAINT_CHECK"
    ) {
      return "Stok miktarı rezerve miktarın altına indirilemez.";
    }
  }

  return "Kayıt sırasında beklenmeyen bir hata oluştu.";
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
  revalidatePath("/admin/urunler");
  revalidatePath("/urunler");
  revalidatePath("/bayi/urunler");

  if (productId) {
    revalidatePath(`/admin/urunler/${productId}`);
  }
}

export async function saveCategory(input: CatalogActionInput, maybeFormData?: FormData): Promise<CatalogActionState> {
  const user = await requireAdminUser();
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
    revalidatePath("/admin/urunler");
    revalidatePath("/urunler");
    revalidatePath("/bayi/urunler");

    return success(parsed.data.id ? "Kategori güncellendi." : "Kategori oluşturuldu.");
  } catch (error) {
    return failure(mapCatalogMutationError(error));
  }
}

export async function savePriceList(input: CatalogActionInput, maybeFormData?: FormData): Promise<CatalogActionState> {
  const user = await requireAdminUser();
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }

  const parsed = priceListFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    currency: formData.get("currency"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    return failure(getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }

  try {
    const priceList = parsed.data.id
      ? await prisma.priceList.update({
          where: { id: parsed.data.id },
          data: {
            name: parsed.data.name,
            currency: parsed.data.currency,
            isActive: parsed.data.isActive,
          },
        })
      : await prisma.priceList.create({
          data: {
            name: parsed.data.name,
            currency: parsed.data.currency,
            isActive: parsed.data.isActive,
          },
        });

    await writeAuditLog(user.id, parsed.data.id ? "price_list.update" : "price_list.create", "PriceList", priceList.id, {
      currency: priceList.currency,
    });
    revalidatePath("/admin/urunler");
    revalidatePath("/urunler");
    revalidatePath("/bayi/urunler");

    return success(parsed.data.id ? "Fiyat listesi güncellendi." : "Fiyat listesi oluşturuldu.");
  } catch (error) {
    return failure(mapCatalogMutationError(error));
  }
}

export async function saveProductBundle(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requireAdminUser();
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }

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
    isCustomAvailable: formData.get("isCustomAvailable"),
    processingNotes: formData.get("processingNotes") || undefined,
    compatibilityNotes: formData.get("compatibilityNotes") || undefined,
    orderMode: formData.get("orderMode"),
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
        isCustomAvailable: productParsed.data.isCustomAvailable,
        processingNotes: nullable(productParsed.data.processingNotes),
        compatibilityNotes: nullable(productParsed.data.compatibilityNotes),
        orderMode: productParsed.data.orderMode,
        status: productParsed.data.status,
      };

      const product = productParsed.data.id
        ? await tx.product.update({ where: { id: productParsed.data.id }, data: productData })
        : await tx.product.create({ data: productData });

      await tx.stockItem.upsert({
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

      return product;
    });

    await writeAuditLog(
      user.id,
      productParsed.data.id ? "product.update_bundle" : "product.create_bundle",
      "Product",
      result.id,
      { code: result.code },
    );
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
  const user = await requireAdminUser();
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }

  const parsed = stockFormSchema.safeParse({
    productId: formData.get("productId"),
    warehouseCode: formData.get("warehouseCode"),
    quantity: formData.get("quantity") || 0,
    reservedQuantity: 0,
    visibility: formData.get("visibility"),
    status: formData.get("status"),
  });

  if (!parsed.success || !parsed.data.productId) {
    return failure(parsed.success ? "Ürün seçimi zorunludur." : getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }

  try {
    await prisma.stockItem.upsert({
      where: {
        productId_warehouseCode: {
          productId: parsed.data.productId,
          warehouseCode: parsed.data.warehouseCode,
        },
      },
      update: {
        quantity: parsed.data.quantity,
        visibility: parsed.data.visibility,
        status: parsed.data.status,
      },
      create: {
        productId: parsed.data.productId,
        warehouseCode: parsed.data.warehouseCode,
        quantity: parsed.data.quantity,
        reservedQuantity: 0,
        visibility: parsed.data.visibility,
        status: parsed.data.status,
      },
    });

    await writeAuditLog(user.id, "stock.upsert", "StockItem", parsed.data.productId, {
      warehouseCode: parsed.data.warehouseCode,
    });
    revalidateProductSurfaces(parsed.data.productId);

    return success("Stok güncellendi.");
  } catch (error) {
    return failure(mapCatalogMutationError(error));
  }
}

export async function saveProductPrice(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requireAdminUser();
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }

  const parsed = productPriceFormSchema.safeParse({
    productId: formData.get("productId"),
    priceListId: formData.get("priceListId"),
    amount: formData.get("amount"),
    minQuantity: formData.get("minQuantity") || 1,
  });

  if (!parsed.success || !parsed.data.productId) {
    return failure(parsed.success ? "Ürün seçimi zorunludur." : getFirstValidationMessage(parsed.error.issues[0]?.message ?? ""));
  }

  try {
    await prisma.productPrice.upsert({
      where: {
        productId_priceListId_minQuantity: {
          productId: parsed.data.productId,
          priceListId: parsed.data.priceListId,
          minQuantity: parsed.data.minQuantity,
        },
      },
      update: {
        amount: parsed.data.amount,
      },
      create: {
        productId: parsed.data.productId,
        priceListId: parsed.data.priceListId,
        amount: parsed.data.amount,
        minQuantity: parsed.data.minQuantity,
      },
    });

    await writeAuditLog(user.id, "product_price.upsert", "ProductPrice", parsed.data.productId, {
      priceListId: parsed.data.priceListId,
      minQuantity: parsed.data.minQuantity,
    });
    revalidateProductSurfaces(parsed.data.productId);

    return success("Fiyat güncellendi.");
  } catch (error) {
    return failure(mapCatalogMutationError(error));
  }
}

export async function saveProductCompatibility(
  input: CatalogActionInput,
  maybeFormData?: FormData,
): Promise<CatalogActionState> {
  const user = await requireAdminUser();
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
  const user = await requireAdminUser();
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
  const user = await requireAdminUser();
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
  const user = await requireAdminUser();
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
