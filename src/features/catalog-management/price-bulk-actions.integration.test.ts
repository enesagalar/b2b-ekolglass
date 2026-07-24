import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));

import { prisma } from "@/lib/prisma";
import { bulkAdjustPrices } from "./price-bulk-actions";
import { applyPriceImportBatch } from "./price-import-actions";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const actorId = `bulk-price-actor-${suffix}`;
const categoryId = `bulk-price-category-${suffix}`;
const priceListId = `bulk-price-list-${suffix}`;
const productIds = [`bulk-price-product-a-${suffix}`, `bulk-price-product-b-${suffix}`];

async function adjustmentForm(
  operation: "INCREASE" | "DECREASE",
  method: "PERCENT" | "FIXED",
  value: string,
) {
  const list = await prisma.priceList.findUniqueOrThrow({
    where: { id: priceListId },
  });
  const form = new FormData();
  form.set("priceListId", priceListId);
  form.set("expectedUpdatedAt", list.updatedAt.toISOString());
  form.set("operation", operation);
  form.set("method", method);
  form.set("value", value);
  form.set("reason", "Yeni dönem bayi fiyat güncellemesi");
  form.set("confirmed", "on");
  return form;
}

describe("bulk price adjustment", () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: actorId,
        email: `${suffix}@example.com`,
        name: "Bulk Price Test",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    await prisma.productCategory.create({
      data: { id: categoryId, slug: `bulk-${suffix}`, name: "Bulk Price" },
    });
    await prisma.product.createMany({
      data: productIds.map((id, index) => ({
        id,
        code: `BULK-${suffix}-${index}`,
        name: `Bulk Product ${index}`,
        categoryId,
        glassType: "Temperli",
      })),
    });
    await prisma.priceList.create({
      data: { id: priceListId, name: "Ana Bayi Fiyatı", currency: "TRY" },
    });
    await prisma.productPrice.createMany({
      data: [
        { productId: productIds[0], priceListId, amount: 100, minQuantity: 1 },
        { productId: productIds[1], priceListId, amount: 250, minQuantity: 1 },
      ],
    });
    mocks.requirePermissionUser.mockResolvedValue({ id: actorId });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.catalogImportBatch.deleteMany({ where: { createdById: actorId } });
    await prisma.productPrice.deleteMany({ where: { priceListId } });
    await prisma.priceList.deleteMany({ where: { id: priceListId } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
  });

  it("previews changes before increasing and decreasing every list row atomically", async () => {
    await expect(
      bulkAdjustPrices(await adjustmentForm("INCREASE", "PERCENT", "10")),
    ).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    expect(
      (
        await prisma.productPrice.findMany({
          where: { priceListId },
          orderBy: { amount: "asc" },
        })
      ).map((price) => price.amount.toString()),
    ).toEqual(["100", "250"]);
    const increaseBatch = await prisma.catalogImportBatch.findFirstOrThrow({
      where: { createdById: actorId, kind: "PRICE_ADJUSTMENT", status: "PREVIEW" },
      orderBy: { createdAt: "desc" },
    });
    await expect(applyPriceImportBatch(increaseBatch.id)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(
      (
        await prisma.productPrice.findMany({
          where: { priceListId },
          orderBy: { amount: "asc" },
        })
      ).map((price) => price.amount.toString()),
    ).toEqual(["110", "275"]);

    await expect(
      bulkAdjustPrices(await adjustmentForm("DECREASE", "FIXED", "10")),
    ).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    const decreaseBatch = await prisma.catalogImportBatch.findFirstOrThrow({
      where: { createdById: actorId, kind: "PRICE_ADJUSTMENT", status: "PREVIEW" },
      orderBy: { createdAt: "desc" },
    });
    await expect(applyPriceImportBatch(decreaseBatch.id)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(
      (
        await prisma.productPrice.findMany({
          where: { priceListId },
          orderBy: { amount: "asc" },
        })
      ).map((price) => price.amount.toString()),
    ).toEqual(["100", "265"]);
  });

  it("rolls back the full operation when any price would be non-positive", async () => {
    const before = await prisma.productPrice.findMany({
      where: { priceListId },
      orderBy: { id: "asc" },
    });
    const result = await bulkAdjustPrices(
      await adjustmentForm("DECREASE", "FIXED", "1000"),
    );
    const after = await prisma.productPrice.findMany({
      where: { priceListId },
      orderBy: { id: "asc" },
    });

    expect(result).toMatchObject({ ok: false });
    expect(after.map((price) => price.amount.toString())).toEqual(
      before.map((price) => price.amount.toString()),
    );
  });
});
