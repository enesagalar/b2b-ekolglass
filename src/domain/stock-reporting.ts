import { z } from "zod";

export const stockReportStatuses = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "ASK_FOR_AVAILABILITY",
  "MADE_TO_ORDER",
  "RESERVED",
] as const;

export const stockOperationalClasses = [
  "PHYSICAL_OUT",
  "FULLY_RESERVED",
  "LOW_AVAILABLE",
  "AVAILABLE",
] as const;

export const stockReportSorts = [
  "AVAILABLE_ASC",
  "UPDATED_DESC",
  "CODE_ASC",
  "QUANTITY_ASC",
  "RESERVED_DESC",
] as const;

const filterSchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  warehouse: z.string().trim().max(40).regex(/^[A-Z0-9_-]*$/).optional().default(""),
  status: z.enum(["ALL", ...stockReportStatuses]).optional().default("ALL"),
  availability: z.enum(["ALL", ...stockOperationalClasses]).optional().default("ALL"),
  productStatus: z.enum(["ACTIVE", "DRAFT", "DISCONTINUED"]).optional().default("ACTIVE"),
  sort: z.enum(stockReportSorts).optional().default("AVAILABLE_ASC"),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
});

export type StockReportFilters = z.infer<typeof filterSchema>;

export class InvalidStockReportFiltersError extends Error {}
export class StockReportLimitError extends Error {}

export function resolveStockReportFilters(input: Record<string, string | undefined>) {
  const parsed = filterSchema.safeParse({
    q: input.q,
    warehouse: input.warehouse?.toLocaleUpperCase("tr-TR"),
    status: input.status,
    availability: input.availability,
    productStatus: input.productStatus,
    sort: input.sort,
    page: input.page,
  });
  if (!parsed.success) {
    throw new InvalidStockReportFiltersError("Stok raporu filtreleri geçersizdir.");
  }
  return parsed.data;
}

export type StockCsvRow = {
  productCode: string;
  productName: string;
  categoryName: string;
  productStatus: string;
  warehouseCode: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  operationalStatusLabel: string;
  declaredStatusLabel: string;
  visibilityLabel: string;
  ledgerStatusLabel: string;
  updatedAt: Date;
  snapshotAt: Date;
};

export type StockOperationalClass = (typeof stockOperationalClasses)[number];

export function deriveStockOperationalClass(quantity: number, reservedQuantity: number): StockOperationalClass {
  const available = quantity - reservedQuantity;
  if (quantity <= 0) return "PHYSICAL_OUT";
  if (available <= 0) return "FULLY_RESERVED";
  if (available <= 3) return "LOW_AVAILABLE";
  return "AVAILABLE";
}

export const stockOperationalLabels: Record<StockOperationalClass, string> = {
  PHYSICAL_OUT: "Fiziksel stok yok",
  FULLY_RESERVED: "Tamamı rezerve",
  LOW_AVAILABLE: "Düşük kullanılabilir",
  AVAILABLE: "Kullanılabilir",
};

function spreadsheetSafe(value: string) {
  return /^[\s]*[=+\-@\t\r\n\uFF1D\uFF0B\uFF0D\uFF20]/u.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number) {
  const normalized = typeof value === "number" ? String(value) : spreadsheetSafe(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function buildStockReportCsv(rows: StockCsvRow[]) {
  const header = [
    "Ürün Kodu",
    "Ürün Adı",
    "Kategori",
    "Ürün Durumu",
    "Depo",
    "Fiziksel Stok",
    "Rezerve",
    "Kullanılabilir",
    "Operasyon Durumu",
    "Tanımlı Durum",
    "Görünürlük",
    "Rezervasyon Tutarlılığı",
    "Son Güncelleme",
    "Rapor Zamanı",
  ];
  const lines = rows.map((row) => [
    row.productCode,
    row.productName,
    row.categoryName,
    row.productStatus,
    row.warehouseCode,
    row.quantity,
    row.reservedQuantity,
    row.availableQuantity,
    row.operationalStatusLabel,
    row.declaredStatusLabel,
    row.visibilityLabel,
    row.ledgerStatusLabel,
    row.updatedAt.toISOString(),
    row.snapshotAt.toISOString(),
  ].map(csvCell).join(","));
  return `\uFEFF${[header.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`;
}
