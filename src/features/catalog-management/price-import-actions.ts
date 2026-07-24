"use server";

import { createHash } from "crypto";
import { Workbook } from "exceljs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parsePriceImportRows } from "@/domain/price-import";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const importPath = "/admin/urunler/fiyat-aktarimi";
const maxFileBytes = 5 * 1024 * 1024;

function fail(message: string): never {
  redirect(`${importPath}?error=${encodeURIComponent(message)}`);
}

async function requirePriceManager() {
  return requirePermissionUser("price.manage", importPath);
}

function workbookRows(workbook: Workbook) {
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("Excel çalışma sayfası bulunamadı.");
  const rows: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    rows.push([1, 2, 3, 4].map((column) => row.getCell(column).text));
  });
  return rows;
}

function revalidatePriceSurfaces() {
  [
    "/",
    "/urunler",
    "/sepet",
    "/admin/urunler",
    "/admin/urunler/fiyat-listeleri",
    importPath,
  ].forEach((path) => revalidatePath(path));
}

export async function createPriceImportBatch(formData: FormData) {
  const actor = await requirePriceManager();
  const file = formData.get("file");
  const priceListId = String(formData.get("priceListId") ?? "");
  if (!(file instanceof File) || file.size === 0) fail("Bir Excel dosyası seçin.");
  if (file.size > maxFileBytes) fail("Excel dosyası en fazla 5 MB olabilir.");
  if (!file.name.toLocaleLowerCase("tr-TR").endsWith(".xlsx")) {
    fail("Yalnızca .xlsx Excel dosyası yüklenebilir.");
  }

  const priceList = await prisma.priceList.findFirst({
    where: { id: priceListId, isActive: true },
    select: { id: true },
  });
  if (!priceList) fail("Aktif bir fiyat listesi seçin.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const workbook = new Workbook();
  try {
    const workbookInput =
      bytes as unknown as Parameters<typeof workbook.xlsx.load>[0];
    await workbook.xlsx.load(workbookInput);
  } catch {
    fail("Excel dosyası okunamadı veya geçerli bir .xlsx dosyası değil.");
  }

  let rows;
  try {
    rows = parsePriceImportRows(workbookRows(workbook));
  } catch (error) {
    fail(error instanceof Error ? error.message : "Excel satırları ayrıştırılamadı.");
  }

  const products = await prisma.product.findMany({
    where: { code: { in: rows!.map((row) => row.productCode) } },
    select: {
      id: true,
      code: true,
      prices: {
        where: { priceListId },
        select: {
          id: true,
          amount: true,
          minQuantity: true,
          updatedAt: true,
        },
      },
    },
  });
  const productByCode = new Map(
    products.map((product) => [
      product.code.toLocaleUpperCase("tr-TR").replace(/\s+/g, ""),
      product,
    ]),
  );
  const stagedRows = rows!.map((row) => {
    const product = productByCode.get(row.productCode);
    const errors = [...row.errors];
    if (!product) errors.push("Ürün kodu katalogda bulunamadı.");
    const currentPrice = product?.prices.find(
      (price) => price.minQuantity === row.minQuantity,
    );
    return { row, productId: product?.id, currentPrice, errors };
  });
  const invalidRows = stagedRows.filter((item) => item.errors.length > 0).length;

  const batch = await prisma.catalogImportBatch.create({
    data: {
      kind: "PRICE",
      fileName: file.name.slice(0, 180),
      fileHash: createHash("sha256").update(bytes).digest("hex"),
      priceListId,
      createdById: actor.id,
      totalRows: stagedRows.length,
      validRows: stagedRows.length - invalidRows,
      invalidRows,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      rows: {
        create: stagedRows.map(({ row, productId, currentPrice, errors }) => ({
          rowNumber: row.rowNumber,
          productId,
          productCode: row.productCode,
          netPrice: row.netPrice,
          previousPrice: currentPrice?.amount,
          minQuantity: row.minQuantity,
          expectedPriceUpdatedAt: currentPrice?.updatedAt,
          status: errors.length ? "INVALID" : "VALID",
          errorMessage: errors.length ? errors.join(" ") : null,
        })),
      },
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "catalog.price.import.previewed",
      entityType: "CatalogImportBatch",
      entityId: batch.id,
      metadata: JSON.stringify({
        fileHash: batch.fileHash,
        priceListId,
        totalRows: batch.totalRows,
        invalidRows,
      }),
    },
  });
  redirect(`${importPath}/${batch.id}`);
}

export async function applyPriceImportBatch(batchId: string) {
  const actor = await requirePriceManager();
  const now = new Date();
  try {
    const count = await prisma.$transaction(
      async (tx) => {
        const batch = await tx.catalogImportBatch.findFirst({
          where: {
            id: batchId,
            kind: "PRICE",
            createdById: actor.id,
            status: "PREVIEW",
            expiresAt: { gt: now },
          },
          include: {
            priceList: true,
            rows: { orderBy: { rowNumber: "asc" } },
          },
        });
        if (!batch) throw new Error("PRICE_BATCH_NOT_FOUND");
        if (batch.invalidRows > 0) throw new Error("PRICE_BATCH_INVALID");
        if (
          !batch.priceList.isActive ||
          batch.priceList.startsAt > now ||
          (batch.priceList.endsAt && batch.priceList.endsAt < now)
        ) {
          throw new Error("PRICE_LIST_INACTIVE");
        }

        const currentPrices = await tx.productPrice.findMany({
          where: {
            priceListId: batch.priceListId,
            productId: {
              in: batch.rows
                .map((row) => row.productId)
                .filter((id): id is string => Boolean(id)),
            },
          },
        });
        const currentMap = new Map(
          currentPrices.map((price) => [
            `${price.productId}:${price.minQuantity}`,
            price,
          ]),
        );

        for (const row of batch.rows) {
          if (!row.productId || !row.netPrice || !row.minQuantity) {
            throw new Error("PRICE_BATCH_INVALID");
          }
          const key = `${row.productId}:${row.minQuantity}`;
          const current = currentMap.get(key);
          if (
            (row.previousPrice === null && current) ||
            (row.previousPrice !== null &&
              (!current ||
                !current.amount.equals(row.previousPrice) ||
                current.updatedAt.getTime() !==
                  row.expectedPriceUpdatedAt?.getTime()))
          ) {
            throw new Error("PRICE_BATCH_STALE");
          }

          if (current) {
            const updated = await tx.productPrice.updateMany({
              where: { id: current.id, updatedAt: current.updatedAt },
              data: { amount: row.netPrice },
            });
            if (updated.count !== 1) throw new Error("PRICE_BATCH_STALE");
          } else {
            await tx.productPrice.create({
              data: {
                productId: row.productId,
                priceListId: batch.priceListId,
                minQuantity: row.minQuantity,
                amount: row.netPrice,
              },
            });
          }
        }

        await tx.catalogImportRow.updateMany({
          where: { batchId: batch.id },
          data: { status: "APPLIED" },
        });
        await tx.catalogImportBatch.update({
          where: { id: batch.id },
          data: { status: "APPLIED", appliedAt: now },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: "catalog.price.import.applied",
            entityType: "CatalogImportBatch",
            entityId: batch.id,
            metadata: JSON.stringify({
              fileHash: batch.fileHash,
              priceListId: batch.priceListId,
              rows: batch.totalRows,
            }),
          },
        });
        return batch.totalRows;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    revalidatePriceSurfaces();
    redirect(
      `${importPath}/${batchId}?success=${encodeURIComponent(
        `${count} fiyat satırı uygulandı.`,
      )}`,
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      PRICE_BATCH_NOT_FOUND:
        "Aktarım bulunamadı, süresi doldu veya daha önce işlendi.",
      PRICE_BATCH_INVALID:
        "Hatalı satırlar düzeltilmeden fiyat aktarımı onaylanamaz.",
      PRICE_LIST_INACTIVE: "Seçilen fiyat listesi artık geçerli değil.",
      PRICE_BATCH_STALE:
        "Fiyatlardan biri önizlemeden sonra değişti; hiçbir satır uygulanmadı.",
    };
    redirect(
      `${importPath}/${batchId}?error=${encodeURIComponent(
        messages[code] ?? "Fiyat aktarımı uygulanamadı.",
      )}`,
    );
  }
}

export async function cancelPriceImportBatch(batchId: string) {
  const actor = await requirePriceManager();
  const updated = await prisma.catalogImportBatch.updateMany({
    where: {
      id: batchId,
      kind: "PRICE",
      createdById: actor.id,
      status: "PREVIEW",
    },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  if (!updated.count) {
    redirect(
      `${importPath}/${batchId}?error=${encodeURIComponent(
        "Aktarım iptal edilemedi.",
      )}`,
    );
  }
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "catalog.price.import.cancelled",
      entityType: "CatalogImportBatch",
      entityId: batchId,
    },
  });
  redirect(`${importPath}?success=${encodeURIComponent("Aktarım iptal edildi.")}`);
}

export async function revertPriceBatch(batchId: string) {
  const actor = await requirePriceManager();
  try {
    const count = await prisma.$transaction(
      async (tx) => {
        const batch = await tx.catalogImportBatch.findFirst({
          where: {
            id: batchId,
            kind: { in: ["PRICE", "PRICE_ADJUSTMENT"] },
            createdById: actor.id,
            status: "APPLIED",
          },
          include: { rows: { orderBy: { rowNumber: "asc" } } },
        });
        if (!batch) throw new Error("PRICE_BATCH_NOT_REVERSIBLE");

        for (const row of batch.rows) {
          if (!row.productId || !row.netPrice || !row.minQuantity) {
            throw new Error("PRICE_BATCH_NOT_REVERSIBLE");
          }
          const current = await tx.productPrice.findUnique({
            where: {
              productId_priceListId_minQuantity: {
                productId: row.productId,
                priceListId: batch.priceListId,
                minQuantity: row.minQuantity,
              },
            },
          });
          if (!current || !current.amount.equals(row.netPrice)) {
            throw new Error("PRICE_BATCH_CHANGED");
          }
          if (row.previousPrice === null) {
            await tx.productPrice.delete({ where: { id: current.id } });
          } else {
            await tx.productPrice.update({
              where: { id: current.id },
              data: { amount: row.previousPrice },
            });
          }
        }

        await tx.catalogImportRow.updateMany({
          where: { batchId: batch.id },
          data: { status: "REVERTED" },
        });
        await tx.catalogImportBatch.update({
          where: { id: batch.id },
          data: { status: "REVERTED", cancelledAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: "catalog.price.batch.reverted",
            entityType: "CatalogImportBatch",
            entityId: batch.id,
            metadata: JSON.stringify({ rows: batch.totalRows }),
          },
        });
        return batch.totalRows;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    revalidatePriceSurfaces();
    redirect(
      `${importPath}/${batchId}?success=${encodeURIComponent(
        `${count} fiyat satırı önceki değerine döndürüldü.`,
      )}`,
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const code = error instanceof Error ? error.message : "";
    redirect(
      `${importPath}/${batchId}?error=${encodeURIComponent(
        code === "PRICE_BATCH_CHANGED"
          ? "Bu işlemden sonra fiyatlar yeniden değiştiği için otomatik geri alma durduruldu."
          : "Bu fiyat işlemi geri alınamaz.",
      )}`,
    );
  }
}
