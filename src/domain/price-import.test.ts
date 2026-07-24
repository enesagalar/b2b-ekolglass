import { describe, expect, it } from "vitest";

import {
  PRICE_IMPORT_HEADERS,
  parsePriceImportRows,
} from "@/domain/price-import";

describe("price import rows", () => {
  it("normalizes Turkish price notation and quantity tiers", () => {
    const rows = parsePriceImportRows([
      [...PRICE_IMPORT_HEADERS],
      [" e081000 ", "Ön cam", "1.250,50", "10"],
    ]);

    expect(rows[0]).toMatchObject({
      productCode: "E081000",
      productName: "Ön cam",
      netPrice: "1250.50",
      minQuantity: 10,
      errors: [],
    });
  });

  it("rejects duplicate product tiers and invalid prices", () => {
    const rows = parsePriceImportRows([
      [...PRICE_IMPORT_HEADERS],
      ["E081000", "Ön cam", "0", "1"],
      ["E081000", "Ön cam", "100", "1"],
    ]);

    expect(rows[0].errors).toContain(
      "Liste fiyatı 0'dan büyük ve en fazla iki ondalıklı olmalıdır.",
    );
    expect(rows[1].errors).toContain(
      "Aynı ürün ve minimum adet dosyada birden fazla kez kullanılamaz.",
    );
  });
});
