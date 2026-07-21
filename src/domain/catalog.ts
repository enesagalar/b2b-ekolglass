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
  discountRate?: number | string | null;
};

export type CatalogPriceCandidate = {
  id?: string;
  amount: { toString(): string };
  minQuantity: number;
  priceList: {
    id?: string;
    currency: string;
    companyId?: string | null;
    customerGroupId?: string | null;
    startsAt?: Date;
    endsAt?: Date | null;
    isActive: boolean;
    priority?: number;
  };
};

export type ResolvedCatalogPrice = CatalogPriceCandidate & {
  baseAmount: CatalogPriceCandidate["amount"];
  discountRate: number;
};

export type CatalogStockCandidate = {
  quantity: number;
  reservedQuantity: number;
  visibility: string;
  status: string;
  warehouseCode?: string;
};

export function getProductPublicationReadiness(
  product: {
    prices: Array<{
      amount: { toString(): string };
      minQuantity: number;
      priceList: {
        companyId?: string | null;
        customerGroupId?: string | null;
        isActive: boolean;
        startsAt: Date;
        endsAt?: Date | null;
      };
    }>;
    stockItems: Array<{ quantity: number; reservedQuantity: number }>;
  },
  now = new Date(),
) {
  const hasGeneralPrice = product.prices.some(({ amount, minQuantity, priceList }) => {
    const numericAmount = Number(amount.toString());
    return minQuantity === 1 &&
      Number.isFinite(numericAmount) &&
      numericAmount > 0 &&
      !priceList.companyId &&
      !priceList.customerGroupId &&
      priceList.isActive &&
      priceList.startsAt <= now &&
      (!priceList.endsAt || priceList.endsAt >= now);
  });
  const availableStock = product.stockItems.reduce(
    (sum, stock) => sum + Math.max(0, stock.quantity - stock.reservedQuantity),
    0,
  );

  return {
    hasGeneralPrice,
    availableStock,
    isReady: hasGeneralPrice && availableStock > 0,
  };
}

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
): ResolvedCatalogPrice | null {
  return selectCatalogPriceForQuantity(prices, viewer, 1, now);
}

export function selectCatalogPriceForQuantity(
  prices: CatalogPriceCandidate[],
  viewer: CatalogViewer,
  quantity: number,
  now = new Date(),
): ResolvedCatalogPrice | null {
  if (!canViewCatalogPrices(viewer)) {
    return null;
  }

  const activePrices = prices
    .filter((price) => isPriceListInWindow(price.priceList, now) && price.minQuantity <= quantity)
    .sort((left, right) => {
      const scopeRank = (price: CatalogPriceCandidate) => {
        if (price.priceList.companyId === viewer.companyId && viewer.companyId) return 0;
        if (price.priceList.customerGroupId === viewer.customerGroupId && viewer.customerGroupId) return 1;
        if (!price.priceList.companyId && !price.priceList.customerGroupId) return 2;
        return isAdminRole(viewer.role) ? 3 : 4;
      };
      return scopeRank(left) - scopeRank(right)
        || (right.priceList.priority ?? 0) - (left.priceList.priority ?? 0)
        || right.minQuantity - left.minQuantity
        || (right.priceList.startsAt ?? new Date(0)).getTime() - (left.priceList.startsAt ?? new Date(0)).getTime()
        || (left.priceList.id ?? left.id ?? "").localeCompare(right.priceList.id ?? right.id ?? "");
    });

  const selected = activePrices[0];
  if (!selected) return null;

  const requestedDiscount = Number(viewer.discountRate ?? 0);
  const discountRate =
    viewer.companyId &&
    !selected.priceList.companyId &&
    Number.isFinite(requestedDiscount)
      ? Math.min(100, Math.max(0, requestedDiscount))
      : 0;
  const baseAmount = Number(selected.amount.toString());
  if (discountRate === 0) {
    return {
      ...selected,
      baseAmount: selected.amount,
      discountRate: 0,
    };
  }
  const discountedAmount =
    Math.round((baseAmount * (1 - discountRate / 100) + Number.EPSILON) * 100) /
    100;

  return {
    ...selected,
    baseAmount: selected.amount,
    discountRate,
    amount: { toString: () => discountedAmount.toFixed(2) },
  };
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

export function getStockVisibilityLabel(visibility: string) {
  const labels: Record<string, string> = {
    SIMPLIFIED: "Stok durumunu göster, adedi gizle",
    DETAILED: "Stok adedini yetkili personele göster",
    HIDDEN: "Stok bilgisini müşteriden gizle",
  };

  return labels[visibility] ?? visibility;
}
