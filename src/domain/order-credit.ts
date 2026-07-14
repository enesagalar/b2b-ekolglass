import { Prisma } from "@/generated/prisma/client";

export const orderExposureStatuses = [
  "SUBMITTED",
  "WAITING_FOR_APPROVAL",
  "CONFIRMED",
  "PREPARING",
  "IN_PRODUCTION",
  "READY_FOR_SHIPMENT",
  "SHIPPED",
  "ON_HOLD",
] as const;

export function requiresCommercialReview(input: {
  policy: string;
  limit: Prisma.Decimal | null;
  exposureAfter: Prisma.Decimal;
  currency: string;
}) {
  if (input.currency !== "TRY") return true;
  if (input.policy === "UNLIMITED") return false;
  if (input.policy !== "LIMITED" || input.limit === null) return true;
  return input.exposureAfter.gt(input.limit);
}
