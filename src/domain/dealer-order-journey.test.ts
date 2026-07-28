import { describe, expect, it } from "vitest";

import {
  getDealerOrderJourney,
  getDealerOrderScopeStatuses,
  resolveDealerOrderDateRange,
  resolveDealerOrderScope,
} from "./dealer-order-journey";

describe("dealer order journey", () => {
  it("maps operational scopes without exposing draft orders", () => {
    expect(resolveDealerOrderScope("IN_TRANSIT")).toBe("IN_TRANSIT");
    expect(resolveDealerOrderScope("FORGED")).toBe("ALL");
    expect(getDealerOrderScopeStatuses("REVIEW")).toEqual([
      "SUBMITTED",
      "WAITING_FOR_APPROVAL",
      "ON_HOLD",
    ]);
    expect(getDealerOrderScopeStatuses("ALL")).not.toContain("DRAFT");
  });

  it("explains the next operational step in dealer language", () => {
    expect(getDealerOrderJourney("WAITING_FOR_APPROVAL")).toMatchObject({
      title: "Ticari onay bekleniyor",
      tone: "warning",
    });
    expect(getDealerOrderJourney("SHIPPED", "TRK-42")).toMatchObject({
      title: "Gönderi yolda",
      detail: "Takip numarası: TRK-42",
    });
  });

  it("uses Istanbul business-day boundaries", () => {
    const range = resolveDealerOrderDateRange({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-01",
    });
    expect(range.error).toBeNull();
    expect(range.from?.toISOString()).toBe("2025-12-31T21:00:00.000Z");
    expect(range.toExclusive?.toISOString()).toBe(
      "2026-01-01T21:00:00.000Z",
    );
  });

  it("rejects invalid or reversed date input", () => {
    expect(
      resolveDealerOrderDateRange({
        dateFrom: "2026-02-02",
        dateTo: "2026-02-01",
      }).error,
    ).toContain("sonra");
    expect(resolveDealerOrderDateRange({ dateFrom: "2026-02-30" }).error).toBe(
      "Başlangıç tarihi geçersizdir.",
    );
  });
});
