import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildCatalogPriceWhere } from "./catalog-access";
import { prisma } from "@/lib/prisma";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const categoryId = `isolation-category-${suffix}`;
const productId = `isolation-product-${suffix}`;
const companyAId = `isolation-company-a-${suffix}`;
const companyBId = `isolation-company-b-${suffix}`;
const groupAId = `isolation-group-a-${suffix}`;
const groupBId = `isolation-group-b-${suffix}`;
const listAId = `isolation-list-a-${suffix}`;
const listBId = `isolation-list-b-${suffix}`;
const groupListAId = `isolation-group-list-a-${suffix}`;
const groupListBId = `isolation-group-list-b-${suffix}`;
const publicListId = `isolation-list-public-${suffix}`;

describe("catalog database tenant isolation", () => {
  beforeAll(async () => {
    await prisma.customerGroup.createMany({
      data: [
        { id: groupAId, code: `GA-${suffix}`, name: "Group A" },
        { id: groupBId, code: `GB-${suffix}`, name: "Group B" },
      ],
    });
    await prisma.company.createMany({
      data: [
        { id: companyAId, legalName: "Company A", displayName: "Company A", email: `a-${suffix}@example.com`, phone: "1", city: "A", status: "APPROVED", customerGroupId: groupAId },
        { id: companyBId, legalName: "Company B", displayName: "Company B", email: `b-${suffix}@example.com`, phone: "2", city: "B", status: "APPROVED", customerGroupId: groupBId },
      ],
    });
    await prisma.productCategory.create({ data: { id: categoryId, slug: `isolation-${suffix}`, name: "Isolation" } });
    await prisma.product.create({ data: { id: productId, code: `ISO-${suffix}`, name: "Isolation Product", categoryId, glassType: "Lamine" } });
    await prisma.priceList.createMany({
      data: [
        { id: listAId, name: "Company A", companyId: companyAId },
        { id: listBId, name: "Company B", companyId: companyBId },
        { id: groupListAId, name: "Group A", customerGroupId: groupAId },
        { id: groupListBId, name: "Group B", customerGroupId: groupBId },
        { id: publicListId, name: "Public" },
      ],
    });
    await prisma.productPrice.createMany({
      data: [listAId, listBId, groupListAId, groupListBId, publicListId].map((priceListId, index) => ({
        productId,
        priceListId,
        amount: 100 + index,
        minQuantity: 1,
      })),
    });
  });

  afterAll(async () => {
    await prisma.productPrice.deleteMany({ where: { productId } });
    await prisma.priceList.deleteMany({ where: { id: { in: [listAId, listBId, groupListAId, groupListBId, publicListId] } } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    await prisma.customerGroup.deleteMany({ where: { id: { in: [groupAId, groupBId] } } });
    await prisma.$disconnect();
  });

  it("never fetches another company's or group's prices", async () => {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: {
        prices: {
          where: buildCatalogPriceWhere({ role: "DEALER_OWNER", companyId: companyAId, customerGroupId: groupAId }),
          include: { priceList: true },
        },
      },
    });
    const visibleListIds = product.prices.map((price) => price.priceListId).sort();

    expect(visibleListIds).toEqual([groupListAId, listAId, publicListId].sort());
    expect(visibleListIds).not.toContain(listBId);
    expect(visibleListIds).not.toContain(groupListBId);
  });
});
