export const lowStockAvailableThreshold = 3;

export const automaticStockStatuses = [
  "OUT_OF_STOCK",
  "RESERVED",
  "LOW_STOCK",
  "IN_STOCK",
] as const;

export type AutomaticStockStatus = (typeof automaticStockStatuses)[number];

export function deriveStockStatus(
  quantity: number,
  reservedQuantity: number,
): AutomaticStockStatus {
  const availableQuantity = quantity - reservedQuantity;

  if (quantity <= 0) {
    return "OUT_OF_STOCK";
  }

  if (availableQuantity <= 0) {
    return "RESERVED";
  }

  if (availableQuantity <= lowStockAvailableThreshold) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}
