import { describe, expect, it } from "vitest";

import {
  deriveStockStatus,
  getProductPublicationReadiness,
  resolveCatalogStockSummary,
  selectCatalogPrice,
  selectCatalogPriceForQuantity,
  normalizeProductCode,
  parseOptionalDecimal,
  parseOptionalInt,
  slugifyProductCategoryName,
} from "./catalog";
import {
  accountActivationSchema,
  categoryFormSchema,
  companyDiscountSchema,
  dealerApplicationReviewSchema,
  mediaAssetFormSchema,
  mediaAssetStatusFormSchema,
  productCompatibilityDeleteFormSchema,
  productCompatibilityFormSchema,
  productFormSchema,
  productPriceFormSchema,
  productPublicationSchema,
  quoteSubmitSchema,
  stockFormSchema,
} from "./validation";

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

  it("requires an active general price and available stock before publication", () => {
    const now = new Date("2026-07-13T12:00:00.000Z");
    const ready = getProductPublicationReadiness({
      prices: [{ amount: { toString: () => "100" }, minQuantity: 1, priceList: { isActive: true, startsAt: new Date("2026-07-01T00:00:00.000Z") } }],
      stockItems: [{ quantity: 8, reservedQuantity: 3 }],
    }, now);
    const scopedOnly = getProductPublicationReadiness({
      prices: [{ amount: { toString: () => "100" }, minQuantity: 1, priceList: { companyId: "company-1", isActive: true, startsAt: new Date("2026-07-01T00:00:00.000Z") } }],
      stockItems: [{ quantity: 8, reservedQuantity: 8 }],
    }, now);

    expect(ready).toEqual({ hasGeneralPrice: true, availableStock: 5, isReady: true });
    expect(scopedOnly).toEqual({ hasGeneralPrice: false, availableStock: 0, isReady: false });
  });

  it("does not publish a product whose general price starts above one unit", () => {
    const readiness = getProductPublicationReadiness({
      prices: [{ amount: { toString: () => "90" }, minQuantity: 10, priceList: { isActive: true, startsAt: new Date("2026-07-01T00:00:00.000Z") } }],
      stockItems: [{ quantity: 8, reservedQuantity: 0 }],
    }, new Date("2026-07-13T12:00:00.000Z"));

    expect(readiness).toEqual({ hasGeneralPrice: false, availableStock: 8, isReady: false });
  });

  it("hides catalog prices from guests", () => {
    const price = selectCatalogPrice(
      [
        {
          amount: { toString: () => "1250" },
          minQuantity: 1,
          priceList: { currency: "TRY", isActive: true },
        },
      ],
      { role: "GUEST" },
    );

    expect(price).toBeNull();
  });

  it("prefers company price before customer group and public list", () => {
    const price = selectCatalogPrice(
      [
        {
          amount: { toString: () => "1300" },
          minQuantity: 1,
          priceList: { currency: "TRY", isActive: true },
        },
        {
          amount: { toString: () => "1200" },
          minQuantity: 1,
          priceList: { currency: "TRY", companyId: "company-1", isActive: true },
        },
        {
          amount: { toString: () => "1250" },
          minQuantity: 1,
          priceList: { currency: "TRY", customerGroupId: "group-1", isActive: true },
        },
      ],
      { role: "DEALER_OWNER", companyId: "company-1", customerGroupId: "group-1" },
    );

    expect(price?.amount.toString()).toBe("1200");
  });

  it("applies the company discount to the standard dealer price", () => {
    const price = selectCatalogPrice(
      [
        {
          amount: { toString: () => "1000" },
          minQuantity: 1,
          priceList: { currency: "TRY", isActive: true },
        },
      ],
      { role: "DEALER_OWNER", companyId: "company-1", discountRate: "12.5" },
    );

    expect(price?.baseAmount.toString()).toBe("1000");
    expect(price?.discountRate).toBe(12.5);
    expect(price?.amount.toString()).toBe("875.00");
  });

  it("does not discount an explicit company net price twice", () => {
    const price = selectCatalogPrice(
      [
        {
          amount: { toString: () => "800" },
          minQuantity: 1,
          priceList: { currency: "TRY", companyId: "company-1", isActive: true },
        },
      ],
      { role: "DEALER_OWNER", companyId: "company-1", discountRate: 10 },
    );

    expect(price?.discountRate).toBe(0);
    expect(price?.amount.toString()).toBe("800");
  });

  it("selects the highest eligible quantity tier deterministically", () => {
    const startsAt = new Date("2026-01-01T00:00:00.000Z");
    const price = selectCatalogPriceForQuantity([
      { id: "tier-1", amount: { toString: () => "100" }, minQuantity: 1, priceList: { id: "list-1", currency: "TRY", companyId: "company-1", startsAt, isActive: true, priority: 0 } },
      { id: "tier-10", amount: { toString: () => "80" }, minQuantity: 10, priceList: { id: "list-1", currency: "TRY", companyId: "company-1", startsAt, isActive: true, priority: 0 } },
      { id: "public", amount: { toString: () => "70" }, minQuantity: 1, priceList: { id: "public-list", currency: "TRY", startsAt, isActive: true, priority: 99 } },
    ], { role: "DEALER_OWNER", companyId: "company-1" }, 10);

    expect(price?.amount.toString()).toBe("80");
    expect(price?.minQuantity).toBe(10);
  });

  it("lets internal price readers inspect the first active list without a company", () => {
    const price = selectCatalogPrice(
      [
        {
          amount: { toString: () => "1250" },
          minQuantity: 1,
          priceList: { currency: "TRY", customerGroupId: "group-1", isActive: true },
        },
      ],
      { role: "SUPER_ADMIN" },
    );

    expect(price?.amount.toString()).toBe("1250");
  });

  it("does not fallback to group prices for dealers without a company context", () => {
    const price = selectCatalogPrice(
      [
        {
          amount: { toString: () => "1250" },
          minQuantity: 1,
          priceList: { currency: "TRY", customerGroupId: "group-1", isActive: true },
        },
      ],
      { role: "DEALER_OWNER" },
    );

    expect(price).toBeNull();
  });

  it("keeps non-detailed stock visibility simplified", () => {
    const stock = resolveCatalogStockSummary(
      [
        { quantity: 10, reservedQuantity: 2, visibility: "DETAILED", status: "IN_STOCK" },
        { quantity: 4, reservedQuantity: 0, visibility: "SIMPLIFIED", status: "LOW_STOCK" },
      ],
      { role: "DEALER_OWNER" },
    );

    expect(stock.isDetailed).toBe(false);
    expect(stock.label).toBe("Az Stok");
  });

  it("shows detailed stock totals to internal stock readers", () => {
    const stock = resolveCatalogStockSummary(
      [
        { quantity: 10, reservedQuantity: 2, visibility: "DETAILED", status: "IN_STOCK" },
        { quantity: 4, reservedQuantity: 1, visibility: "HIDDEN", status: "LOW_STOCK" },
      ],
      { role: "WAREHOUSE_STAFF" },
    );

    expect(stock.isDetailed).toBe(true);
    expect(stock.label).toBe("11 uygun / 14 stok");
  });
});

describe("catalog validation schemas", () => {
  it("accepts valid company discounts and rejects values outside zero to one hundred", () => {
    const terms = {
      companyId: "company-1",
      expectedUpdatedAt: "2026-07-22T10:00:00.000Z",
      creditPolicy: "UNSET",
      changeReason: "Yıllık ticari değerlendirme",
    };
    expect(companyDiscountSchema.safeParse({ ...terms, discountRate: "12,5" }).success).toBe(true);
    expect(companyDiscountSchema.safeParse({ ...terms, discountRate: "-1" }).success).toBe(false);
    expect(companyDiscountSchema.safeParse({ ...terms, discountRate: "100.01" }).success).toBe(false);
  });

  it("only allows explicit publish or draft targets", () => {
    expect(productPublicationSchema.safeParse({ productId: "product-1", targetStatus: "ACTIVE" }).success).toBe(true);
    expect(productPublicationSchema.safeParse({ productId: "product-1", targetStatus: "DISCONTINUED" }).success).toBe(false);
  });

  it("validates strong matching activation passwords and byte length", () => {
    const accepted = accountActivationSchema.safeParse({
      token: "a".repeat(43),
      password: "EkolGlass2026Secure",
      passwordConfirm: "EkolGlass2026Secure",
    });
    const mismatched = accountActivationSchema.safeParse({
      token: "a".repeat(43),
      password: "EkolGlass2026Secure",
      passwordConfirm: "EkolGlass2026Different",
    });
    const tooManyBytes = accountActivationSchema.safeParse({
      token: "a".repeat(43),
      password: `Aa1${"ş".repeat(40)}`,
      passwordConfirm: `Aa1${"ş".repeat(40)}`,
    });

    expect(accepted.success).toBe(true);
    expect(mismatched.success).toBe(false);
    expect(tooManyBytes.success).toBe(false);
  });

  it("requires a customer group when approving dealer applications", () => {
    const rejected = dealerApplicationReviewSchema.safeParse({
      id: "application-1",
      expectedUpdatedAt: "2026-07-10T10:00:00.000Z",
      status: "APPROVED",
      creditLimit: "250000",
    });
    const accepted = dealerApplicationReviewSchema.safeParse({
      id: "application-1",
      expectedUpdatedAt: "2026-07-10T10:00:00.000Z",
      status: "APPROVED",
      customerGroupId: "group-1",
      creditLimit: "250000",
    });

    expect(rejected.success).toBe(false);
    expect(accepted.success).toBe(true);
  });

  it("rejects negative dealer credit limits and invalid application versions", () => {
    const negativeLimit = dealerApplicationReviewSchema.safeParse({
      id: "application-1",
      expectedUpdatedAt: "2026-07-10T10:00:00.000Z",
      status: "IN_REVIEW",
      creditLimit: "-1",
    });
    const invalidVersion = dealerApplicationReviewSchema.safeParse({
      id: "application-1",
      expectedUpdatedAt: "not-a-date",
      status: "IN_REVIEW",
    });

    expect(negativeLimit.success).toBe(false);
    expect(invalidVersion.success).toBe(false);
  });

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

  it("rejects forged invalid quote delivery dates", () => {
    const parsed = quoteSubmitSchema.safeParse({
      requesterName: "Bayi Yetkilisi",
      requesterEmail: "bayi@example.com",
      desiredDeliveryDate: "2026-99-99",
      idempotencyKey: crypto.randomUUID(),
    });

    expect(parsed.success).toBe(false);
  });

  it("validates media asset data and active state", () => {
    const parsed = mediaAssetFormSchema.parse({
      productId: "product-1",
      title: "Teknik PDF",
      url: "https://cdn.example.com/teknik.pdf",
      altText: "Teknik dokuman",
      usage: "TECHNICAL_DOCUMENT",
      isActive: "on",
    });

    expect(parsed.isActive).toBe(true);
    expect(parsed.key).toBeUndefined();
  });

  it("validates media active/passive status changes", () => {
    const parsed = mediaAssetStatusFormSchema.parse({
      id: "media-1",
      productId: "product-1",
      isActive: "false",
    });

    expect(parsed.isActive).toBe(false);
  });

  it("validates compatibility data and delete requests", () => {
    const parsed = productCompatibilityFormSchema.parse({
      productId: "product-1",
      vehicleBrand: " Fiat ",
      vehicleModel: " Ducato ",
      yearStart: "2020",
      yearEnd: "2026",
      oemReference: "EGL-123",
      notes: "",
    });
    const deleteParsed = productCompatibilityDeleteFormSchema.parse({
      id: "compatibility-1",
      productId: "product-1",
    });

    expect(parsed.vehicleBrand).toBe("Fiat");
    expect(parsed.vehicleModel).toBe("Ducato");
    expect(parsed.yearStart).toBe(2020);
    expect(parsed.notes).toBeUndefined();
    expect(deleteParsed.id).toBe("compatibility-1");
  });

  it("rejects compatibility yearEnd before yearStart", () => {
    const parsed = productCompatibilityFormSchema.safeParse({
      productId: "product-1",
      vehicleBrand: "Fiat",
      vehicleModel: "Ducato",
      yearStart: "2026",
      yearEnd: "2020",
    });

    expect(parsed.success).toBe(false);
  });
});
