import type { Permission } from "@/domain/roles";
import { quoteStatuses } from "@/domain/statuses";

export type QuoteStatus = (typeof quoteStatuses)[number];

export const quoteStatusTransitions: Record<
  QuoteStatus,
  readonly QuoteStatus[]
> = {
  NEW: ["IN_REVIEW", "CANCELLED"],
  IN_REVIEW: [
    "WAITING_FOR_CUSTOMER_INFO",
    "PRICED",
    "REJECTED",
    "CANCELLED",
  ],
  WAITING_FOR_CUSTOMER_INFO: ["IN_REVIEW", "CANCELLED"],
  PRICED: ["OFFER_SENT", "IN_REVIEW", "CANCELLED"],
  OFFER_SENT: ["APPROVED", "PRICED", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CONVERTED_TO_ORDER: [],
  CANCELLED: [],
};

export function isQuoteStatus(value: string): value is QuoteStatus {
  return quoteStatuses.includes(value as QuoteStatus);
}

export function getAllowedQuoteTransitions(status: string) {
  return isQuoteStatus(status) ? quoteStatusTransitions[status] : [];
}

export function canTransitionQuote(fromStatus: string, toStatus: string) {
  return (
    isQuoteStatus(toStatus) &&
    getAllowedQuoteTransitions(fromStatus).includes(toStatus)
  );
}

export function getQuoteTransitionPermission(
  toStatus: QuoteStatus,
): Permission {
  if (toStatus === "PRICED") return "quote.price";
  if (toStatus === "OFFER_SENT") return "quote.send";
  if (toStatus === "APPROVED") return "quote.approve";
  if (toStatus === "CANCELLED") return "quote.cancel";
  return "quote.review";
}
