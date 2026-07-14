import { describe, expect, it } from "vitest";

import { parsePriceStockCsv } from "./price-stock-import";

const header = "urun_kodu,net_bayi_fiyati,stok_miktari,depo_kodu,stok_gorunurlugu";

describe("parsePriceStockCsv", () => {
  it("parses UTF-8 BOM, localized price and visibility values", () => {
    const [row] = parsePriceStockCsv(`\uFEFF${header}\nE037002,"1.250,50",12,MERKEZ,SADE`);
    expect(row).toMatchObject({ productCode: "E037002", netPrice: "1250.50", stockQuantity: 12, warehouseCode: "MERKEZ", stockVisibility: "SIMPLIFIED", errors: [] });
  });

  it("reports duplicate codes and malformed commercial values per row", () => {
    const rows = parsePriceStockCsv(`${header}\nE037002,1250,12,MERKEZ,DETAYLI\nE037002,0,1.5,x,bilinmiyor`);
    expect(rows[1].errors).toEqual(expect.arrayContaining([
      "Aynı ürün kodu dosyada birden fazla kez kullanılamaz.",
      "Net bayi fiyatı 0'dan büyük ve en fazla iki ondalıklı olmalıdır.",
      "Stok miktarı 0-1.000.000 arasında tam sayı olmalıdır.",
      "Depo kodu 2-40 karakter ve yalnızca harf, rakam, _ veya - içermelidir.",
      "Stok görünürlüğü GIZLI, SADE veya DETAYLI olmalıdır.",
    ]));
  });

  it("rejects a changed header contract", () => {
    expect(() => parsePriceStockCsv("kod,fiyat,stok,depo,gorunurluk\nE037002,10,1,MERKEZ,SADE")).toThrow("CSV başlıkları");
  });
});
