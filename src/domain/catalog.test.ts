import { describe, expect, it } from "vitest";

import {
  deriveStockStatus,
  normalizeProductCode,
  parseOptionalDecimal,
  parseOptionalInt,
  slugifyProductCategoryName,
} from "./catalog";
import { categoryFormSchema, productFormSchema, productPriceFormSchema, stockFormSchema } from "./validation";

describe("catalog helpers", () => {
  it("normalizes product codes", () => {
    expect(normalizeProductCode(" egl ot 1458 ")).toBe("EGL-OT-1458");
  });

  it("slugifies Turkish category names", () => {
    expect(slugifyProductCategoryName("Ön Cam Ürünleri")).toBe("on-cam-urunleri");
  });

  it("parses optional localized numbers", () => {
    expect(parseOptionalInt("2026")).toBe(2026);
    expect(parseOptionalInt("")).toBeUndefined();
    expect(parseOptionalDecimal("5,50")).toBe(5.5);
    expect(parseOptionalDecimal("")).toBeUndefined();
  });

  it("derives stock status from available quantity", () => {
    expect(deriveStockStatus(0, 0)).toBe("OUT_OF_STOCK");
    expect(deriveStockStatus(8, 8)).toBe("RESERVED");
    expect(deriveStockStatus(5, 3)).toBe("LOW_STOCK");
    expect(deriveStockStatus(10, 1)).toBe("IN_STOCK");
  });
});

describe("catalog validation schemas", () => {
  it("generates category slug from name when slug is blank", () => {
    const parsed = categoryFormSchema.parse({
      name: "Özel Üretim Cam",
      slug: "",
      description: "",
      sortOrder: "3",
    });

    expect(parsed.slug).toBe("ozel-uretim-cam");
    expect(parsed.sortOrder).toBe(3);
  });

  it("normalizes product code and validates year range", () => {
    const parsed = productFormSchema.safeParse({
      code: " egl ot 1458 ",
      name: "Fiat Ducato Ön Cam",
      categoryId: "category-1",
      yearStart: "2020",
      yearEnd: "2026",
      glassType: "Lamine",
      orderMode: "QUOTE_OR_ORDER",
      status: "ACTIVE",
      thicknessMm: "5,00",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.code).toBe("EGL-OT-1458");
      expect(parsed.data.thicknessMm).toBe(5);
    }
  });

  it("rejects product yearEnd before yearStart", () => {
    const parsed = productFormSchema.safeParse({
      code: "EGL-1",
      name: "Hatalı Ürün",
      categoryId: "category-1",
      yearStart: "2026",
      yearEnd: "2020",
      glassType: "Lamine",
      orderMode: "QUOTE_OR_ORDER",
      status: "ACTIVE",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid product status and negative thickness", () => {
    const parsed = productFormSchema.safeParse({
      code: "EGL-1",
      name: "Hatalı Ürün",
      categoryId: "category-1",
      glassType: "Lamine",
      orderMode: "QUOTE_OR_ORDER",
      status: "PUBLIC",
      thicknessMm: "-4",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates stock quantities and normalizes warehouse code", () => {
    const parsed = stockFormSchema.safeParse({
      productId: "product-1",
      warehouseCode: " merkez ",
      quantity: "10",
      reservedQuantity: "2",
      visibility: "SIMPLIFIED",
      status: "IN_STOCK",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.warehouseCode).toBe("MERKEZ");
    }
  });

  it("rejects reserved quantity greater than stock", () => {
    const parsed = stockFormSchema.safeParse({
      productId: "product-1",
      warehouseCode: "MERKEZ",
      quantity: "3",
      reservedQuantity: "4",
      visibility: "SIMPLIFIED",
      status: "IN_STOCK",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates price amount and minimum quantity", () => {
    const parsed = productPriceFormSchema.parse({
      productId: "product-1",
      priceListId: "price-list-1",
      amount: "1250,75",
      minQuantity: "2",
    });

    expect(parsed.amount).toBe(1250.75);
    expect(parsed.minQuantity).toBe(2);
  });
});
