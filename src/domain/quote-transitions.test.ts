import { describe, expect, it } from "vitest";

import {
  canTransitionQuote,
  getAllowedQuoteTransitions,
  getQuoteTransitionPermission,
} from "@/domain/quote-transitions";

describe("quote transition policy", () => {
  it("keeps terminal states closed", () => {
    for (const status of [
      "APPROVED",
      "REJECTED",
      "CONVERTED_TO_ORDER",
      "CANCELLED",
    ]) {
      expect(getAllowedQuoteTransitions(status)).toEqual([]);
    }
  });

  it("requires review before pricing and sending", () => {
    expect(canTransitionQuote("NEW", "PRICED")).toBe(false);
    expect(canTransitionQuote("NEW", "IN_REVIEW")).toBe(true);
    expect(canTransitionQuote("IN_REVIEW", "PRICED")).toBe(true);
    expect(canTransitionQuote("PRICED", "OFFER_SENT")).toBe(true);
  });

  it("maps sensitive transitions to separate permissions", () => {
    expect(getQuoteTransitionPermission("IN_REVIEW")).toBe("quote.review");
    expect(getQuoteTransitionPermission("PRICED")).toBe("quote.price");
    expect(getQuoteTransitionPermission("OFFER_SENT")).toBe("quote.send");
    expect(getQuoteTransitionPermission("APPROVED")).toBe("quote.approve");
    expect(getQuoteTransitionPermission("CANCELLED")).toBe("quote.cancel");
  });
});
