import { describe, expect, it } from "vitest";

import {
  buildStockReportPageHref,
  buildStockReportCsv,
  resolveStockReportFilters,
} from "@/domain/stock-reporting";

describe("stock reporting", () => {
  it("normalizes filters and applies bounded defaults", () => {
    expect(resolveStockReportFilters({ warehouse: " merkez ", page: "2" })).toEqual({
      q: "",
      warehouse: "MERKEZ",
      status: "ALL",
      availability: "ALL",
      productStatus: "ACTIVE",
      sort: "AVAILABLE_ASC",
      page: 2,
    });
  });

  it("rejects invalid filter values", () => {
    expect(() => resolveStockReportFilters({ status: "UNKNOWN" })).toThrow("geçersizdir");
    expect(() => resolveStockReportFilters({ warehouse: "A/B" })).toThrow("geçersizdir");
    expect(() => resolveStockReportFilters({ page: "0" })).toThrow("geçersizdir");
  });

  it("keeps pagination inside the active stock workspace", () => {
    const filters = resolveStockReportFilters({
      q: "sprinter",
      warehouse: "merkez",
      availability: "LOW_AVAILABLE",
      page: "2",
    });

    expect(buildStockReportPageHref(filters, 3, "/admin/stok")).toBe(
      "/admin/stok?page=3&sort=AVAILABLE_ASC&productStatus=ACTIVE&q=sprinter&warehouse=MERKEZ&availability=LOW_AVAILABLE",
    );
    expect(buildStockReportPageHref(filters, 3, "/admin/raporlar")).toBe(
      "/admin/raporlar?page=3&sort=AVAILABLE_ASC&productStatus=ACTIVE&view=stock&q=sprinter&warehouse=MERKEZ&availability=LOW_AVAILABLE",
    );
  });

  it("creates BOM-prefixed RFC 4180 CSV and neutralizes spreadsheet formulas", () => {
    const csv = buildStockReportCsv([{
      productCode: "=2+2",
      productName: 'Ön Cam, "Sol"',
      categoryName: "Cam",
      productStatus: "Aktif",
      warehouseCode: "MERKEZ",
      quantity: 12,
      reservedQuantity: 3,
      availableQuantity: 9,
      operationalStatusLabel: "Kullanılabilir",
      declaredStatusLabel: "Stokta",
      visibilityLabel: "Detaylı",
      ledgerStatusLabel: "Tutarlı",
      updatedAt: new Date("2026-07-16T10:00:00.000Z"),
      snapshotAt: new Date("2026-07-16T10:05:00.000Z"),
    }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"\'=2+2"');
    expect(csv).toContain('"Ön Cam, ""Sol"""');
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it.each(["\n=SUM(A1:A2)", "＝2+2", " ＋cmd", "＠SUM(A1)"])(
    "neutralizes Unicode or whitespace formula prefix %j",
    (productCode) => {
      const csv = buildStockReportCsv([{
        productCode,
        productName: "Cam",
        categoryName: "Kategori",
        productStatus: "Aktif",
        warehouseCode: "MERKEZ",
        quantity: 1,
        reservedQuantity: 0,
        availableQuantity: 1,
        operationalStatusLabel: "Düşük kullanılabilir",
        declaredStatusLabel: "Stokta",
        visibilityLabel: "Sade",
        ledgerStatusLabel: "Tutarlı",
        updatedAt: new Date("2026-07-16T10:00:00.000Z"),
        snapshotAt: new Date("2026-07-16T10:05:00.000Z"),
      }]);
      expect(csv).toContain(`'${productCode}`);
    },
  );
});
