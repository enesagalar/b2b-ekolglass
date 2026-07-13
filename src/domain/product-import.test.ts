import { describe, expect, it } from "vitest";

import { parseEkolProductCsv } from "./product-import";

describe("Ekol product CSV parser", () => {
  it("preserves Turkish product data and maps technical columns", () => {
    const csv = [
      ",,,,,,,,,,,,,",
      "Ekol Kod,Stok Adı,Açıklama,Mod. Yıl,En-Boy,S/S,mm,Özellik,Delik,Çrçv / Oyk,Beyaz,Yeşil,Füme,GALAXY",
      "OTOMOBİL - PANELVAN - MİNÜBÜS GRUBU,,,,,,,,,,,,,",
      "CİTROEN,,,,,,,,,,,,,",
      "E037036,CİTROEN JUMPY,ORTA KAPI AÇILIR CAM,07-17,584 * 1020,S/S,4,SRG BOM,,ÇERÇEVELİ,,X,,",
    ].join("\n");

    const result = parseEkolProductCsv(csv);
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      code: "E037036",
      vehicleBrand: "CİTROEN",
      yearStart: 2007,
      yearEnd: 2017,
      dimensions: "584 x 1020 mm",
      thicknessMm: 4,
      tint: "Yeşil",
      glassType: "Temperli",
    });
  });

  it("rejects files without the expected header", () => {
    expect(() => parseEkolProductCsv("code,name\n1,test")).toThrow("Ekol Kod");
  });
});
