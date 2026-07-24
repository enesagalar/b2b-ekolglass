import { Workbook } from "exceljs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requirePermissionUser: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error(url), { digest: "NEXT_REDIRECT" });
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));

import { prisma } from "@/lib/prisma";
import {
  applyPriceImportBatch,
  createPriceImportBatch,
  revertPriceBatch,
} from "./price-import-actions";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const actorId = `excel-price-actor-${suffix}`;
const categoryId = `excel-price-category-${suffix}`;
const productId = `excel-price-product-${suffix}`;
const priceListId = `excel-price-list-${suffix}`;
const productCode = `PX-${suffix}`.slice(0, 60).toUpperCase();

async function excelFile() {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Fiyatlar");
  sheet.addRow(["urun_kodu", "urun_adi", "liste_fiyati", "minimum_adet"]);
  sheet.addRow([productCode, "Excel Product", 125.5, 1]);
  const output = await workbook.xlsx.writeBuffer();
  return new File([new Uint8Array(output)], "fiyatlar.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("Excel price import lifecycle", () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: actorId,
        email: `${suffix}@example.com`,
        name: "Excel Price Test",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    await prisma.productCategory.create({
      data: { id: categoryId, slug: `excel-price-${suffix}`, name: "Excel Price" },
    });
    await prisma.product.create({
      data: {
        id: productId,
        code: productCode,
        name: "Excel Product",
        categoryId,
        glassType: "Temperli",
      },
    });
    await prisma.priceList.create({
      data: { id: priceListId, name: "Excel List", currency: "TRY" },
    });
    await prisma.productPrice.create({
      data: { productId, priceListId, amount: 100, minQuantity: 1 },
    });
    mocks.requirePermissionUser.mockResolvedValue({ id: actorId });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.catalogImportBatch.deleteMany({ where: { createdById: actorId } });
    await prisma.productPrice.deleteMany({ where: { priceListId } });
    await prisma.priceList.deleteMany({ where: { id: priceListId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
  });

  it("previews, applies and atomically reverts an Excel price change", async () => {
    const form = new FormData();
    form.set("priceListId", priceListId);
    form.set("file", await excelFile());

    await expect(createPriceImportBatch(form)).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    const batch = await prisma.catalogImportBatch.findFirstOrThrow({
      where: { createdById: actorId, kind: "PRICE" },
      include: { rows: true },
    });
    expect(batch).toMatchObject({
      status: "PREVIEW",
      totalRows: 1,
      invalidRows: 0,
    });
    expect(batch.rows[0]).toMatchObject({
      productId,
      previousPrice: expect.objectContaining({}),
      minQuantity: 1,
      status: "VALID",
    });

    await expect(applyPriceImportBatch(batch.id)).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(
      (
        await prisma.productPrice.findUniqueOrThrow({
          where: {
            productId_priceListId_minQuantity: {
              productId,
              priceListId,
              minQuantity: 1,
            },
          },
        })
      ).amount.toString(),
    ).toBe("125.5");

    await expect(revertPriceBatch(batch.id)).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(
      (
        await prisma.productPrice.findUniqueOrThrow({
          where: {
            productId_priceListId_minQuantity: {
              productId,
              priceListId,
              minQuantity: 1,
            },
          },
        })
      ).amount.toString(),
    ).toBe("100");
    expect(
      await prisma.catalogImportBatch.findUniqueOrThrow({
        where: { id: batch.id },
      }),
    ).toMatchObject({ status: "REVERTED" });
  });
});
