import { parse } from "csv-parse/sync";

const categoryDefinitions = [
  {
    source: "OTOMOBIL - PANELVAN - MINIBUS GRUBU",
    slug: "otomobil-panelvan-minibus",
    name: "Otomobil, Panelvan ve Minibüs Camları",
    sortOrder: 10,
  },
  {
    source: "OTOBUS GRUBU",
    slug: "otobus-camlari",
    name: "Otobüs Camları",
    sortOrder: 20,
  },
  {
    source: "IS MAKINESI - KABIN GRUBU- KARAVAN",
    slug: "is-makinesi-kabin-karavan",
    name: "İş Makinesi, Kabin ve Karavan Camları",
    sortOrder: 30,
  },
] as const;

export type ImportedProductCategory = {
  slug: string;
  name: string;
  sortOrder: number;
};

export type ImportedProduct = {
  code: string;
  name: string;
  categorySlug: string;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  yearStart: number | null;
  yearEnd: number | null;
  glassPosition: string | null;
  glassType: "Temperli" | "Lamine";
  dimensions: string | null;
  thicknessMm: number | null;
  tint: string | null;
  isTempered: boolean;
  isLaminated: boolean;
  processingNotes: string | null;
  compatibilityNotes: string | null;
};

export type ProductImportParseResult = {
  categories: ImportedProductCategory[];
  products: ImportedProduct[];
  skippedRows: number;
};

function normalizeHeading(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/\s+/g, " ");
}

function clean(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function parseShortYear(value: string) {
  const year = Number(value);
  if (!Number.isInteger(year)) return null;
  if (value.length === 4) return year;
  return year <= 26 ? 2000 + year : 1900 + year;
}

function parseYearRange(value: string) {
  const match = clean(value).match(/^(\d{2,4})\s*-\s*(\d{0,4})$/);
  if (!match) return { yearStart: null, yearEnd: null };
  return {
    yearStart: parseShortYear(match[1]),
    yearEnd: match[2] ? parseShortYear(match[2]) : null,
  };
}

function normalizeDimensions(value: string) {
  const dimensions = clean(value).replace(/\s*[xX*]\s*/g, " x ");
  if (!dimensions) return null;
  return /\bmm$/i.test(dimensions) ? dimensions : `${dimensions} mm`;
}

function isLikelyBrandHeading(value: string) {
  return value.length <= 32 && !/[0-9/()]/.test(value);
}

export function parseEkolProductCsv(input: Buffer | string): ProductImportParseResult {
  const text = Buffer.isBuffer(input) ? input.toString("utf8") : input;
  if (text.includes("\uFFFD")) {
    throw new Error("CSV UTF-8 olarak okunamadı. Dosyayı UTF-8 CSV olarak kaydedin.");
  }

  const rows = parse(text.replace(/^\uFEFF/, ""), {
    bom: true,
    columns: false,
    relax_column_count: true,
    skip_empty_lines: false,
    trim: false,
  }) as string[][];
  const headerIndex = rows.findIndex((row) => clean(row[0]) === "Ekol Kod");
  if (headerIndex < 0) throw new Error("Ekol Kod başlığı bulunamadı.");

  let currentCategory: (typeof categoryDefinitions)[number] = categoryDefinitions[0];
  let currentBrand: string | null = null;
  let skippedRows = 0;
  const byCode = new Map<string, ImportedProduct>();

  for (const rawRow of rows.slice(headerIndex + 1)) {
    const row = [...rawRow, ...Array(14).fill("")].slice(0, 14);
    const code = clean(row[0]);
    const otherValues = row.slice(1).map(clean);

    if (code && otherValues.every((value) => !value)) {
      const normalized = normalizeHeading(code);
      const category = categoryDefinitions.find((item) => item.source === normalized);
      if (category) {
        currentCategory = category;
        currentBrand = null;
      } else if (isLikelyBrandHeading(code)) {
        currentBrand = code;
      }
      continue;
    }

    if (!/^[ER]\d{6}$/i.test(code)) {
      if (row.some((value) => clean(value))) skippedRows += 1;
      continue;
    }

    const stockName = clean(row[1]);
    const description = clean(row[2]);
    if (!stockName || !description) {
      skippedRows += 1;
      continue;
    }

    const combined = normalizeHeading(`${stockName} ${description} ${row[7]}`);
    const isLaminated = /LAMINE/.test(combined);
    const colors = ["Beyaz", "Yeşil", "Füme", "Galaxy"].filter((_, index) => clean(row[10 + index]));
    const notes = [
      clean(row[5]) ? `Yön: ${clean(row[5])}` : "",
      clean(row[7]) ? `Özellik: ${clean(row[7])}` : "",
      clean(row[8]) ? `Delik: ${clean(row[8])}` : "",
      clean(row[9]) ? `Çerçeve/Oyuk: ${clean(row[9])}` : "",
      colors.length ? `Renk seçenekleri: ${colors.join(", ")}` : "",
    ].filter(Boolean);
    const years = parseYearRange(row[3]);
    const thickness = Number(clean(row[6]).replace(",", "."));

    byCode.set(code.toLocaleUpperCase("tr-TR"), {
      code: code.toLocaleUpperCase("tr-TR"),
      name: `${stockName} - ${description}`,
      categorySlug: currentCategory.slug,
      vehicleBrand: currentBrand,
      vehicleModel: stockName,
      yearStart: years.yearStart,
      yearEnd: years.yearEnd,
      glassPosition: description,
      glassType: isLaminated ? "Lamine" : "Temperli",
      dimensions: normalizeDimensions(row[4]),
      thicknessMm: Number.isFinite(thickness) && thickness > 0 ? thickness : null,
      tint: colors.length ? colors.join(", ") : null,
      isTempered: !isLaminated,
      isLaminated,
      processingNotes: notes.length ? notes.join(" | ") : null,
      compatibilityNotes: description,
    });
  }

  if (!byCode.size) throw new Error("CSV içinde geçerli Ekol ürün kodu bulunamadı.");

  return {
    categories: categoryDefinitions.map(({ slug, name, sortOrder }) => ({ slug, name, sortOrder })),
    products: [...byCode.values()],
    skippedRows,
  };
}
