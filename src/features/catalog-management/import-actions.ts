"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { parseEkolProductCsv } from "@/domain/product-import";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ProductImportState = {
  ok?: boolean;
  message?: string;
  created?: number;
  updated?: number;
  skipped?: number;
};

const maxCsvBytes = 1024 * 1024;

function chunks<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

export async function importProductsCsvAction(
  _state: ProductImportState,
  formData: FormData,
): Promise<ProductImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.toLocaleLowerCase("tr-TR").endsWith(".csv")) {
    return { ok: false, message: "UTF-8 kodlu bir CSV dosyasi secin." };
  }
  if (!file.size || file.size > maxCsvBytes) {
    return { ok: false, message: "CSV dosyasi bos olamaz ve 1 MB sinirini asamaz." };
  }

  const actor = await requirePermissionUser("product.manage", "/admin/urunler");
  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed: ReturnType<typeof parseEkolProductCsv>;
  try {
    parsed = parseEkolProductCsv(buffer);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "CSV okunamadi." };
  }

  const categoryIds = new Map<string, string>();
  for (const category of parsed.categories) {
    const saved = await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: category.sortOrder },
      create: category,
      select: { id: true, slug: true },
    });
    categoryIds.set(saved.slug, saved.id);
  }

  const existing = await prisma.product.findMany({
    where: { code: { in: parsed.products.map((product) => product.code) } },
    select: { id: true, code: true },
  });
  const existingCodes = new Set(existing.map((product) => product.code));
  const createRows = parsed.products
    .filter((product) => !existingCodes.has(product.code))
    .map((product) => ({
      ...product,
      categoryId: categoryIds.get(product.categorySlug)!,
      categorySlug: undefined,
      orderMode: "ORDER_ONLY",
      status: "DRAFT",
      isCustomAvailable: false,
    }));
  const updateRows = parsed.products.filter((product) => existingCodes.has(product.code));

  for (const batch of chunks(createRows, 250)) {
    await prisma.product.createMany({ data: batch });
  }
  for (const batch of chunks(updateRows, 100)) {
    await prisma.$transaction(
      batch.map((product) =>
        prisma.product.update({
          where: { code: product.code },
          data: {
            name: product.name,
            categoryId: categoryIds.get(product.categorySlug)!,
            vehicleBrand: product.vehicleBrand,
            vehicleModel: product.vehicleModel,
            yearStart: product.yearStart,
            yearEnd: product.yearEnd,
            glassPosition: product.glassPosition,
            glassType: product.glassType,
            dimensions: product.dimensions,
            thicknessMm: product.thicknessMm,
            tint: product.tint,
            isTempered: product.isTempered,
            isLaminated: product.isLaminated,
            processingNotes: product.processingNotes,
            compatibilityNotes: product.compatibilityNotes,
          },
        }),
      ),
    );
  }

  const importedProducts = await prisma.product.findMany({
    where: { code: { in: parsed.products.map((product) => product.code) } },
    select: { id: true },
  });
  const stockRows = await prisma.stockItem.findMany({
    where: { productId: { in: importedProducts.map((product) => product.id) }, warehouseCode: "MERKEZ" },
    select: { productId: true },
  });
  const productsWithStock = new Set(stockRows.map((stock) => stock.productId));
  for (const batch of chunks(importedProducts.filter((product) => !productsWithStock.has(product.id)), 250)) {
    await prisma.stockItem.createMany({
      data: batch.map((product) => ({
        productId: product.id,
        warehouseCode: "MERKEZ",
        quantity: 0,
        reservedQuantity: 0,
        visibility: "SIMPLIFIED",
        status: "ASK_FOR_AVAILABILITY",
      })),
    });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "product.csv.import",
      entityType: "Product",
      metadata: JSON.stringify({
        fileName: file.name,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        created: createRows.length,
        updated: updateRows.length,
        skipped: parsed.skippedRows,
      }),
    },
  });

  revalidatePath("/admin/urunler");
  revalidatePath("/urunler");
  return {
    ok: true,
    message: "CSV katalogu iceri alindi. Yeni urunler fiyat ve stok tanimlanana kadar taslakta tutulur.",
    created: createRows.length,
    updated: updateRows.length,
    skipped: parsed.skippedRows,
  };
}
