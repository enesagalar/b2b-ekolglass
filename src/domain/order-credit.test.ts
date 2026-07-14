import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { requiresCommercialReview } from "@/domain/order-credit";

describe("order credit policy", () => {
  it("allows exposure exactly at a TRY limit", () => {
    expect(requiresCommercialReview({ policy: "LIMITED", limit: new Prisma.Decimal(100), exposureAfter: new Prisma.Decimal(100), currency: "TRY" })).toBe(false);
  });

  it("requires review above the limit or with unknown terms", () => {
    expect(requiresCommercialReview({ policy: "LIMITED", limit: new Prisma.Decimal(100), exposureAfter: new Prisma.Decimal("100.01"), currency: "TRY" })).toBe(true);
    expect(requiresCommercialReview({ policy: "UNSET", limit: null, exposureAfter: new Prisma.Decimal(1), currency: "TRY" })).toBe(true);
    expect(requiresCommercialReview({ policy: "LEGACY", limit: null, exposureAfter: new Prisma.Decimal(1), currency: "TRY" })).toBe(true);
  });

  it("allows explicit unlimited TRY policy but fails closed for other currencies", () => {
    expect(requiresCommercialReview({ policy: "UNLIMITED", limit: null, exposureAfter: new Prisma.Decimal(999999), currency: "TRY" })).toBe(false);
    expect(requiresCommercialReview({ policy: "UNLIMITED", limit: null, exposureAfter: new Prisma.Decimal(1), currency: "EUR" })).toBe(true);
  });
});
