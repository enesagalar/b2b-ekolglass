"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deriveStockStatus } from "@/domain/catalog";
import { recordStockMovement } from "@/domain/stock-movement";
import { parsePriceStockCsv } from "@/domain/price-stock-import";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const importPath = "/admin/urunler/fiyat-stok-aktarimi";
const maxFileBytes = 2 * 1024 * 1024;

async function requireImportUser() {
  const user = await requirePermissionUser("price.manage", importPath);
  await requirePermissionUser("stock.manage", importPath);
  return user;
}

function fail(message: string): never {
  redirect(`${importPath}?error=${encodeURIComponent(message)}`);
}

export async function createPriceStockImportBatch(formData: FormData) {
  const actor = await requireImportUser();
  const file = formData.get("file");
  const priceListId = String(formData.get("priceListId") ?? "");
  if (!(file instanceof File) || file.size === 0) fail("Bir CSV dosyası seçin.");
  if (file.size > maxFileBytes) fail("CSV dosyası en fazla 2 MB olabilir.");
  if (!file.name.toLocaleLowerCase("tr-TR").endsWith(".csv")) fail("Yalnızca .csv dosyası yüklenebilir.");

  const priceList = await prisma.priceList.findFirst({
    where: { id: priceListId, companyId: null, customerGroupId: null, isActive: true },
    select: { id: true },
  });
  if (!priceList) fail("Aktif ve genel bir standart bayi fiyat listesi seçin.");

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    fail("CSV UTF-8 olarak okunamadı. Dosyayı UTF-8 CSV olarak kaydedin.");
  }

  let rows;
  try {
    rows = parsePriceStockCsv(text!);
  } catch (error) {
    fail(error instanceof Error ? error.message : "CSV ayrıştırılamadı.");
  }

  const products = await prisma.product.findMany({
    where: { code: { in: rows!.map((row) => row.productCode) } },
    select: { id: true, code: true, stockItems: { select: { warehouseCode: true, reservedQuantity: true } } },
  });
  const productByCode = new Map(products.map((product) => [product.code.toLocaleUpperCase("tr-TR"), product]));
  const stagedRows = rows!.map((row) => {
    const product = productByCode.get(row.productCode);
    const errors = [...row.errors];
    if (!product) errors.push("Ürün kodu katalogda bulunamadı.");
    const stock = product?.stockItems.find((item) => item.warehouseCode === row.warehouseCode);
    if (stock && row.stockQuantity !== null && row.stockQuantity < stock.reservedQuantity) {
      errors.push(`Stok miktarı mevcut ${stock.reservedQuantity} adet rezervasyonun altına düşemez.`);
    }
    return { row, productId: product?.id, errors };
  });
  const invalidRows = stagedRows.filter((item) => item.errors.length > 0).length;

  const batch = await prisma.catalogImportBatch.create({
    data: {
      fileName: file.name.slice(0, 180),
      fileHash: createHash("sha256").update(text!).digest("hex"),
      priceListId,
      createdById: actor.id,
      totalRows: stagedRows.length,
      validRows: stagedRows.length - invalidRows,
      invalidRows,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      rows: {
        create: stagedRows.map(({ row, productId, errors }) => ({
          rowNumber: row.rowNumber,
          productId,
          productCode: row.productCode,
          netPrice: row.netPrice,
          warehouseCode: row.warehouseCode,
          stockQuantity: row.stockQuantity,
          stockVisibility: row.stockVisibility,
          status: errors.length ? "INVALID" : "VALID",
          errorMessage: errors.length ? errors.join(" ") : null,
        })),
      },
    },
  });
  await prisma.auditLog.create({ data: { actorUserId: actor.id, action: "catalog.price_stock.import.previewed", entityType: "CatalogImportBatch", entityId: batch.id, metadata: JSON.stringify({ fileHash: batch.fileHash, totalRows: batch.totalRows, invalidRows }) } });
  redirect(`${importPath}/${batch.id}`);
}

export async function applyPriceStockImportBatch(batchId: string) {
  const actor = await requireImportUser();
  const now = new Date();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.catalogImportBatch.findFirst({
        where: { id: batchId, createdById: actor.id, status: "PREVIEW", expiresAt: { gt: now } },
        include: { priceList: true, rows: { where: { status: "VALID" }, orderBy: { rowNumber: "asc" } } },
      });
      if (!batch) throw new Error("Aktarım partisi bulunamadı, süresi doldu veya daha önce işlendi.");
      if (batch.invalidRows > 0 || batch.rows.length !== batch.totalRows) throw new Error("Hatalı satırlar düzeltilmeden aktarım onaylanamaz.");
      if (!batch.priceList.isActive || batch.priceList.companyId || batch.priceList.customerGroupId || batch.priceList.startsAt > now || (batch.priceList.endsAt && batch.priceList.endsAt < now)) throw new Error("Seçilen standart fiyat listesi artık geçerli değil.");

      const productIds = batch.rows.map((row) => row.productId).filter((id): id is string => Boolean(id));
      const currentStocks = await tx.stockItem.findMany({ where: { productId: { in: productIds } } });
      const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, code: true } });
      const productCodeMap = new Map(products.map((product) => [product.id, product.code]));
      const stockMap = new Map(currentStocks.map((stock) => [`${stock.productId}:${stock.warehouseCode}`, stock]));
      for (const row of batch.rows) {
        if (!row.productId || row.netPrice === null || row.stockQuantity === null || !row.warehouseCode || !row.stockVisibility) throw new Error(`Satır ${row.rowNumber} eksik veri içeriyor.`);
        const current = stockMap.get(`${row.productId}:${row.warehouseCode}`);
        const reserved = current?.reservedQuantity ?? 0;
        if (row.stockQuantity < reserved) throw new Error(`${row.productCode} stoğu güncel ${reserved} adet rezervasyonun altına düşemez.`);
        await tx.productPrice.upsert({
          where: { productId_priceListId_minQuantity: { productId: row.productId, priceListId: batch.priceListId, minQuantity: 1 } },
          update: { amount: row.netPrice },
          create: { productId: row.productId, priceListId: batch.priceListId, minQuantity: 1, amount: row.netPrice },
        });
        const before = { quantity: current?.quantity ?? 0, reservedQuantity: reserved };
        const stock = await tx.stockItem.upsert({
          where: { productId_warehouseCode: { productId: row.productId, warehouseCode: row.warehouseCode } },
          update: { quantity: row.stockQuantity, visibility: row.stockVisibility, status: deriveStockStatus(row.stockQuantity, reserved) },
          create: { productId: row.productId, warehouseCode: row.warehouseCode, quantity: row.stockQuantity, reservedQuantity: 0, visibility: row.stockVisibility, status: deriveStockStatus(row.stockQuantity, 0) },
        });
        await recordStockMovement(tx, {
          stockItemId: stock.id,
          productId: row.productId,
          productCode: productCodeMap.get(row.productId) ?? row.productCode,
          warehouseCode: row.warehouseCode,
          movementType: "CSV_IMPORT",
          before,
          after: { quantity: stock.quantity, reservedQuantity: stock.reservedQuantity },
          actorUserId: actor.id,
          reason: `Onaylı fiyat/stok aktarımı: ${batch.fileName}`,
          sourceType: "CATALOG_IMPORT_BATCH",
          sourceId: batch.id,
          idempotencyKey: `catalog-import:${batch.id}:${row.id}`,
          metadata: { rowNumber: row.rowNumber, fileHash: batch.fileHash },
        });
      }
      await tx.catalogImportBatch.update({ where: { id: batch.id }, data: { status: "APPLIED", appliedAt: now } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "catalog.price_stock.import.applied", entityType: "CatalogImportBatch", entityId: batch.id, metadata: JSON.stringify({ fileHash: batch.fileHash, priceListId: batch.priceListId, rows: batch.totalRows }) } });
      return batch.totalRows;
    }, { timeout: 60_000, maxWait: 10_000 });
    revalidatePath("/"); revalidatePath("/urunler"); revalidatePath("/bayi/urunler"); revalidatePath("/admin/urunler"); revalidatePath("/admin/urunler/yayin-hazirligi");
    redirect(`${importPath}/${batchId}?success=${encodeURIComponent(`${result} ürünün standart fiyatı ve stoğu güncellendi.`)}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`${importPath}/${batchId}?error=${encodeURIComponent(error instanceof Error ? error.message : "Aktarım uygulanamadı.")}`);
  }
}

export async function cancelPriceStockImportBatch(batchId: string) {
  const actor = await requireImportUser();
  const updated = await prisma.catalogImportBatch.updateMany({ where: { id: batchId, createdById: actor.id, status: "PREVIEW" }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  if (!updated.count) redirect(`${importPath}/${batchId}?error=${encodeURIComponent("Parti iptal edilemedi.")}`);
  await prisma.auditLog.create({ data: { actorUserId: actor.id, action: "catalog.price_stock.import.cancelled", entityType: "CatalogImportBatch", entityId: batchId } });
  redirect(`${importPath}?success=${encodeURIComponent("Aktarım partisi iptal edildi.")}`);
}
