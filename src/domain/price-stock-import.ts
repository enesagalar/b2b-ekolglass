import { parse } from "csv-parse/sync";

export const PRICE_STOCK_IMPORT_HEADERS = [
  "urun_kodu",
  "net_bayi_fiyati",
  "stok_miktari",
  "depo_kodu",
  "stok_gorunurlugu",
] as const;

export const MAX_PRICE_STOCK_IMPORT_ROWS = 2_000;

export type ParsedPriceStockRow = {
  rowNumber: number;
  productCode: string;
  netPrice: string | null;
  stockQuantity: number | null;
  warehouseCode: string | null;
  stockVisibility: "HIDDEN" | "SIMPLIFIED" | "DETAILED" | null;
  errors: string[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeProductCode(value: string) {
  return value.toLocaleUpperCase("tr-TR").replace(/\s+/g, "");
}

function parsePrice(value: string) {
  const normalized = value.replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000_000 ? normalized : null;
}

function parseVisibility(value: string) {
  const normalized = value.toLocaleUpperCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const aliases: Record<string, ParsedPriceStockRow["stockVisibility"]> = {
    HIDDEN: "HIDDEN", GIZLI: "HIDDEN", SIMPLIFIED: "SIMPLIFIED", SADE: "SIMPLIFIED", DETAILED: "DETAILED", DETAYLI: "DETAILED",
  };
  return aliases[normalized] ?? null;
}

export function parsePriceStockCsv(input: string): ParsedPriceStockRow[] {
  if (input.includes("\uFFFD")) throw new Error("CSV UTF-8 olarak okunamadı. Dosyayı UTF-8 CSV olarak kaydedin.");
  const records = parse(input.replace(/^\uFEFF/, ""), {
    bom: true,
    columns: false,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];
  if (records.length < 2) throw new Error("CSV en az bir veri satırı içermelidir.");
  const headers = records[0].map(clean);
  if (headers.length !== PRICE_STOCK_IMPORT_HEADERS.length || headers.some((header, index) => header !== PRICE_STOCK_IMPORT_HEADERS[index])) {
    throw new Error(`CSV başlıkları şu sırada olmalıdır: ${PRICE_STOCK_IMPORT_HEADERS.join(", ")}`);
  }
  if (records.length - 1 > MAX_PRICE_STOCK_IMPORT_ROWS) throw new Error(`Tek dosyada en fazla ${MAX_PRICE_STOCK_IMPORT_ROWS} ürün aktarılabilir.`);

  const seenCodes = new Set<string>();
  return records.slice(1).map((record, index) => {
    const rowNumber = index + 2;
    const productCode = normalizeProductCode(clean(record[0]));
    const price = parsePrice(clean(record[1]));
    const stockText = clean(record[2]);
    const stockQuantity = /^\d+$/.test(stockText) && Number(stockText) <= 1_000_000 ? Number(stockText) : null;
    const warehouseCode = clean(record[3]).toLocaleUpperCase("tr-TR");
    const stockVisibility = parseVisibility(clean(record[4]));
    const errors: string[] = [];
    if (!/^[ER]\d{6}$/i.test(productCode)) errors.push("Ürün kodu E veya R ile başlayan 7 karakterli Ekol kodu olmalıdır.");
    if (seenCodes.has(productCode)) errors.push("Aynı ürün kodu dosyada birden fazla kez kullanılamaz.");
    if (productCode) seenCodes.add(productCode);
    if (!price) errors.push("Net bayi fiyatı 0'dan büyük ve en fazla iki ondalıklı olmalıdır.");
    if (stockQuantity === null) errors.push("Stok miktarı 0-1.000.000 arasında tam sayı olmalıdır.");
    if (!/^[A-Z0-9_-]{2,40}$/.test(warehouseCode)) errors.push("Depo kodu 2-40 karakter ve yalnızca harf, rakam, _ veya - içermelidir.");
    if (!stockVisibility) errors.push("Stok görünürlüğü GIZLI, SADE veya DETAYLI olmalıdır.");
    if (record.length !== PRICE_STOCK_IMPORT_HEADERS.length) errors.push("Satırdaki sütun sayısı CSV sözleşmesiyle uyuşmuyor.");
    return { rowNumber, productCode, netPrice: price, stockQuantity, warehouseCode: warehouseCode || null, stockVisibility, errors };
  });
}
