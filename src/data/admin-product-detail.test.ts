import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLogFindMany: vi.fn(),
  mediaAssetFindMany: vi.fn(),
  priceListFindMany: vi.fn(),
  productCompatibilityFindMany: vi.fn(),
  productFindUnique: vi.fn(),
  productPriceFindMany: vi.fn(),
  stockItemFindMany: vi.fn(),
  warehouseFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: mocks.auditLogFindMany },
    mediaAsset: { findMany: mocks.mediaAssetFindMany },
    priceList: { findMany: mocks.priceListFindMany },
    product: { findUnique: mocks.productFindUnique },
    productCompatibility: { findMany: mocks.productCompatibilityFindMany },
    productPrice: { findMany: mocks.productPriceFindMany },
    stockItem: { findMany: mocks.stockItemFindMany },
    warehouse: { findMany: mocks.warehouseFindMany },
  },
}));

import {
  adminProductDetailTabKeys,
  getAdminProductDetailData,
  resolveAdminProductDetailTab,
} from "@/data/admin-product-detail";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.productFindUnique.mockResolvedValue({
    id: "product-1",
    category: { id: "category-1", name: "Otomotiv Camı" },
  });
  mocks.productPriceFindMany.mockResolvedValue([]);
  mocks.stockItemFindMany.mockResolvedValue([]);
  mocks.productCompatibilityFindMany.mockResolvedValue([]);
  mocks.mediaAssetFindMany.mockResolvedValue([]);
  mocks.priceListFindMany.mockResolvedValue([]);
  mocks.warehouseFindMany.mockResolvedValue([]);
  mocks.auditLogFindMany.mockResolvedValue([]);
});

describe("admin product detail tabs", () => {
  it.each(adminProductDetailTabKeys)("accepts the %s tab", (tab) => {
    expect(resolveAdminProductDetailTab(tab)).toBe(tab);
  });

  it.each([undefined, "", "unknown", "__proto__"])(
    "falls back to the general tab for %s",
    (tab) => {
      expect(resolveAdminProductDetailTab(tab)).toBe("genel");
    },
  );
});

describe("admin product detail query plan", () => {
  const permissions = {
    id: "product-1",
    canReadPrice: true,
    canReadStock: true,
    canManageStock: true,
  };

  it("keeps the general tab on publication summaries", async () => {
    await getAdminProductDetailData({ ...permissions, activeTab: "genel" });

    expect(mocks.productPriceFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.stockItemFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.productCompatibilityFindMany).not.toHaveBeenCalled();
    expect(mocks.mediaAssetFindMany).not.toHaveBeenCalled();
    expect(mocks.priceListFindMany).not.toHaveBeenCalled();
    expect(mocks.warehouseFindMany).not.toHaveBeenCalled();
    expect(mocks.auditLogFindMany).not.toHaveBeenCalled();
  });

  it("reuses full price rows for publication readiness on the price tab", async () => {
    await getAdminProductDetailData({ ...permissions, activeTab: "fiyat" });

    expect(mocks.productPriceFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.priceListFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.stockItemFindMany).toHaveBeenCalledTimes(1);
  });

  it("reuses full stock rows and loads warehouses only on the stock tab", async () => {
    await getAdminProductDetailData({ ...permissions, activeTab: "stok" });

    expect(mocks.stockItemFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.warehouseFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.productPriceFindMany).toHaveBeenCalledTimes(1);
  });

  it("loads media records only on the media tab", async () => {
    await getAdminProductDetailData({ ...permissions, activeTab: "medya" });

    expect(mocks.mediaAssetFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.productCompatibilityFindMany).not.toHaveBeenCalled();
  });

  it("loads product and price audit records without unrelated relations", async () => {
    mocks.productPriceFindMany.mockResolvedValue([
      {
        id: "price-1",
        amount: { toString: () => "100" },
        minQuantity: 1,
        priceList: {
          companyId: null,
          customerGroupId: null,
          isActive: true,
          startsAt: new Date("2026-01-01"),
          endsAt: null,
        },
      },
    ]);

    await getAdminProductDetailData({ ...permissions, activeTab: "audit" });

    expect(mocks.auditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { entityType: "Product", entityId: "product-1" },
            { entityType: "ProductPrice", entityId: { in: ["price-1"] } },
          ],
        },
      }),
    );
    expect(mocks.mediaAssetFindMany).not.toHaveBeenCalled();
    expect(mocks.productCompatibilityFindMany).not.toHaveBeenCalled();
    expect(mocks.priceListFindMany).not.toHaveBeenCalled();
    expect(mocks.warehouseFindMany).not.toHaveBeenCalled();
  });
});
