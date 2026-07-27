import { dealerApplicationStatuses } from "@/domain/statuses";

export type DealerApplicationStatus = (typeof dealerApplicationStatuses)[number];

const allowedTransitions: Record<DealerApplicationStatus, DealerApplicationStatus[]> = {
  NEW: ["NEW", "IN_REVIEW", "NEEDS_INFO", "APPROVED", "REJECTED"],
  IN_REVIEW: ["IN_REVIEW", "NEEDS_INFO", "APPROVED", "REJECTED"],
  NEEDS_INFO: ["NEEDS_INFO", "IN_REVIEW", "APPROVED", "REJECTED"],
  REJECTED: ["REJECTED", "IN_REVIEW"],
  APPROVED: ["APPROVED"],
};

export function getAllowedDealerApplicationTransitions(status: string) {
  if (!dealerApplicationStatuses.includes(status as DealerApplicationStatus)) {
    return [];
  }

  return allowedTransitions[status as DealerApplicationStatus];
}

export function canTransitionDealerApplication(fromStatus: string, toStatus: string) {
  return getAllowedDealerApplicationTransitions(fromStatus).includes(
    toStatus as DealerApplicationStatus,
  );
}

export function getRecommendedDealerApplicationStatus(
  status: DealerApplicationStatus,
): DealerApplicationStatus {
  if (status === "NEW" || status === "NEEDS_INFO" || status === "REJECTED") {
    return "IN_REVIEW";
  }

  return status;
}

