import { describe, expect, it } from "vitest";

import {
  canTransitionDealerApplication,
  getAllowedDealerApplicationTransitions,
  getRecommendedDealerApplicationStatus,
} from "@/domain/dealer-application-workflow";

describe("dealer application workflow", () => {
  it("returns only server-supported transitions", () => {
    expect(getAllowedDealerApplicationTransitions("APPROVED")).toEqual(["APPROVED"]);
    expect(getAllowedDealerApplicationTransitions("REJECTED")).toEqual([
      "REJECTED",
      "IN_REVIEW",
    ]);
    expect(canTransitionDealerApplication("IN_REVIEW", "NEW")).toBe(false);
    expect(canTransitionDealerApplication("IN_REVIEW", "APPROVED")).toBe(true);
  });

  it("recommends review without making an approval decision for the operator", () => {
    expect(getRecommendedDealerApplicationStatus("NEW")).toBe("IN_REVIEW");
    expect(getRecommendedDealerApplicationStatus("NEEDS_INFO")).toBe("IN_REVIEW");
    expect(getRecommendedDealerApplicationStatus("IN_REVIEW")).toBe("IN_REVIEW");
  });

  it("fails closed for unknown states", () => {
    expect(getAllowedDealerApplicationTransitions("UNKNOWN")).toEqual([]);
    expect(canTransitionDealerApplication("UNKNOWN", "APPROVED")).toBe(false);
  });
});

