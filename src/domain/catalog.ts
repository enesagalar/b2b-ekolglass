import { hasPermission, isAdminRole, type Role } from "./roles";
import { getStatusLabel } from "./statuses";

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

export type CatalogViewer = {
  role: Role;
  companyId?: string | null;
  customerGroupId?: string | null;
};

export type CatalogPriceCandidate = {
  amount: { toString(): string };
  minQuantity: number;
  priceList: {
    currency: string;
    companyId?: string | null;
    customerGroupId?: string | null;
    startsAt?: Date;
    endsAt?: Date | null;
    isActive: boolean;
  };
};

export type CatalogStockCandidate = {
  quantity: number;
  reservedQuantity: number;
  visibility: string;
  status: string;
  warehouseCode?: string;
};

export function canViewCatalogPrices(viewer: CatalogViewer) {
  if (!hasPermission(viewer.role, "price.read")) {
    return false;
  }

  if (["DEALER_OWNER", "DEALER_STAFF"].includes(viewer.role)) {
    return Boolean(viewer.companyId);
  }

  return true;
}

export function canViewDetailedCatalogStock(viewer: CatalogViewer) {
  return hasPermission(viewer.role, "stock.read.detailed");
}

function isPriceListInWindow(priceList: CatalogPriceCandidate["priceList"], now: Date) {
  const startsAt = priceList.startsAt ?? new Date(0);

  return priceList.isActive && startsAt <= now && (!priceList.endsAt || priceList.endsAt >= now);
}

export function selectCatalogPrice(
  prices: CatalogPriceCandidate[],
  viewer: CatalogViewer,
  now = new Date(),
) {
  if (!canViewCatalogPrices(viewer)) {
    return null;
  }

  const activePrices = prices
    .filter((price) => isPriceListInWindow(price.priceList, now))
    .sort((left, right) => left.minQuantity - right.minQuantity);

  return (
    activePrices.find((price) => price.priceList.companyId && price.priceList.companyId === viewer.companyId) ??
    activePrices.find(
      (price) => price.priceList.customerGroupId && price.priceList.customerGroupId === viewer.customerGroupId,
    ) ??
    activePrices.find((price) => !price.priceList.companyId && !price.priceList.customerGroupId) ??
    (isAdminRole(viewer.role) ? activePrices[0] : null) ??
    null
  );
}

export function resolveCatalogStockSummary(stockItems: CatalogStockCandidate[], viewer: CatalogViewer) {
  if (canViewDetailedCatalogStock(viewer)) {
    const totalQuantity = stockItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalReserved = stockItems.reduce((sum, item) => sum + item.reservedQuantity, 0);
    const availableQuantity = Math.max(0, totalQuantity - totalReserved);

    return {
      label: totalQuantity > 0 ? `${availableQuantity} uygun / ${totalQuantity} stok` : "Stok sorunuz",
      detail: stockItems.length > 0 ? `${stockItems.length} depo` : "Depo kaydi yok",
      status: deriveStockStatus(totalQuantity, totalReserved),
      isDetailed: true,
    };
  }

  const simplifiedStock = stockItems.find((item) => item.visibility === "SIMPLIFIED");

  return {
    label: simplifiedStock ? getStatusLabel(simplifiedStock.status) : "Stok sorunuz",
    detail: "Net adet yetkiye bagli",
    status: simplifiedStock?.status ?? "ASK_FOR_AVAILABILITY",
    isDetailed: false,
  };
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
