export const PRICE_IMPORT_HEADERS = [
  "urun_kodu",
  "urun_adi",
  "liste_fiyati",
  "minimum_adet",
] as const;

export const MAX_PRICE_IMPORT_ROWS = 5_000;

export type ParsedPriceImportRow = {
  rowNumber: number;
  productCode: string;
  productName: string;
  netPrice: string | null;
  minQuantity: number | null;
  errors: string[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeProductCode(value: string) {
  return value.toLocaleUpperCase("tr-TR").replace(/\s+/g, "");
}

function parsePrice(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000_000
    ? normalized
    : null;
}

export function parsePriceImportRows(rows: unknown[][]): ParsedPriceImportRow[] {
  if (rows.length < 2) {
    throw new Error("Excel dosyası en az bir fiyat satırı içermelidir.");
  }

  const headers = rows[0].map(clean);
  if (
    headers.length < PRICE_IMPORT_HEADERS.length ||
    PRICE_IMPORT_HEADERS.some((header, index) => headers[index] !== header)
  ) {
    throw new Error(
      `Excel başlıkları şu sırada olmalıdır: ${PRICE_IMPORT_HEADERS.join(", ")}`,
    );
  }

  const dataRows = rows
    .slice(1)
    .filter((row) => row.some((value) => clean(value).length > 0));
  if (dataRows.length > MAX_PRICE_IMPORT_ROWS) {
    throw new Error(
      `Tek dosyada en fazla ${MAX_PRICE_IMPORT_ROWS} fiyat satırı aktarılabilir.`,
    );
  }

  const seenKeys = new Set<string>();
  return dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const productCode = normalizeProductCode(clean(row[0]));
    const productName = clean(row[1]);
    const netPrice = parsePrice(clean(row[2]));
    const quantityText = clean(row[3] || "1");
    const minQuantity =
      /^\d+$/.test(quantityText) &&
      Number(quantityText) >= 1 &&
      Number(quantityText) <= 100_000
        ? Number(quantityText)
        : null;
    const errors: string[] = [];
    const duplicateKey = `${productCode}:${minQuantity ?? quantityText}`;

    if (!/^[A-Z0-9._/-]{2,64}$/.test(productCode)) {
      errors.push("Ürün kodu 2-64 karakterli geçerli bir katalog kodu olmalıdır.");
    }
    if (seenKeys.has(duplicateKey)) {
      errors.push("Aynı ürün ve minimum adet dosyada birden fazla kez kullanılamaz.");
    }
    if (productCode) seenKeys.add(duplicateKey);
    if (!netPrice) {
      errors.push("Liste fiyatı 0'dan büyük ve en fazla iki ondalıklı olmalıdır.");
    }
    if (minQuantity === null) {
      errors.push("Minimum adet 1-100.000 arasında tam sayı olmalıdır.");
    }

    return {
      rowNumber,
      productCode,
      productName,
      netPrice,
      minQuantity,
      errors,
    };
  });
}
