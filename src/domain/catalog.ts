export const productStatuses = ["ACTIVE", "DRAFT", "DISCONTINUED"] as const;
export const productOrderModes = ["QUOTE_OR_ORDER", "QUOTE_ONLY", "ORDER_ONLY"] as const;
export const productGlassTypes = ["Lamine", "Temperli", "Rezistanslı", "Akustik", "Proje Bazlı"] as const;
export const stockVisibilities = ["SIMPLIFIED", "DETAILED", "HIDDEN"] as const;
export const currencies = ["TRY", "USD", "EUR"] as const;

const turkishCharacterMap: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

export function normalizeProductCode(value: string) {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

export function slugifyProductCategoryName(value: string) {
  return value
    .trim()
    .replace(/[çÇğĞıIİöÖşŞüÜ]/g, (character) => turkishCharacterMap[character] ?? character)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function parseOptionalInt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export function parseOptionalDecimal(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const normalized = String(value).trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function deriveStockStatus(quantity: number, reservedQuantity: number) {
  const availableQuantity = quantity - reservedQuantity;

  if (quantity <= 0) {
    return "OUT_OF_STOCK";
  }

  if (availableQuantity <= 0) {
    return "RESERVED";
  }

  if (availableQuantity <= 3) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}

export function getProductStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Yayında",
    DRAFT: "Taslak",
    DISCONTINUED: "Pasif",
  };

  return labels[status] ?? status;
}

export function getOrderModeLabel(orderMode: string) {
  const labels: Record<string, string> = {
    QUOTE_OR_ORDER: "Sipariş / teklif",
    QUOTE_ONLY: "Sadece teklif",
    ORDER_ONLY: "Sadece sipariş",
  };

  return labels[orderMode] ?? orderMode;
}
