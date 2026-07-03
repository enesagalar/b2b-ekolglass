"use server";

import { revalidatePath } from "next/cache";

import {
  categoryFormSchema,
  priceListFormSchema,
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
    revalidatePath("/katalog");

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
    revalidatePath("/katalog");

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
    reservedQuantity: formData.get("reservedQuantity") || 0,
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
          reservedQuantity: stockParsed.data.reservedQuantity,
          visibility: stockParsed.data.visibility,
          status: stockParsed.data.status,
        },
        create: {
          productId: product.id,
          warehouseCode: stockParsed.data.warehouseCode,
          quantity: stockParsed.data.quantity,
          reservedQuantity: stockParsed.data.reservedQuantity,
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
    revalidatePath("/admin/urunler");
    revalidatePath("/katalog");

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
    reservedQuantity: formData.get("reservedQuantity") || 0,
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
        reservedQuantity: parsed.data.reservedQuantity,
        visibility: parsed.data.visibility,
        status: parsed.data.status,
      },
      create: {
        productId: parsed.data.productId,
        warehouseCode: parsed.data.warehouseCode,
        quantity: parsed.data.quantity,
        reservedQuantity: parsed.data.reservedQuantity,
        visibility: parsed.data.visibility,
        status: parsed.data.status,
      },
    });

    await writeAuditLog(user.id, "stock.upsert", "StockItem", parsed.data.productId, {
      warehouseCode: parsed.data.warehouseCode,
    });
    revalidatePath("/admin/urunler");
    revalidatePath("/katalog");

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
    revalidatePath("/admin/urunler");
    revalidatePath("/katalog");

    return success("Fiyat güncellendi.");
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
