import { describe, expect, it } from "vitest";

import { resolveReportPeriod } from "@/domain/reporting";

describe("reporting period", () => {
  it("defaults to a thirty day inclusive range", () => {
    const period = resolveReportPeriod({ now: new Date(2026, 6, 16, 12) });
    expect(period.fromInput).toBe("2026-06-17");
    expect(period.toInput).toBe("2026-07-16");
    expect(period.rangeDays).toBe(30);
    expect(period.currency).toBe("TRY");
  });

  it("normalizes an explicit currency and exclusive end", () => {
    const period = resolveReportPeriod({ from: "2026-07-01", to: "2026-07-05", currency: "eur" });
    expect(period.currency).toBe("EUR");
    expect(period.rangeDays).toBe(5);
    expect(period.from.toISOString()).toBe("2026-06-30T21:00:00.000Z");
    expect(period.toExclusive.toISOString()).toBe("2026-07-05T21:00:00.000Z");
  });

  it("keeps Istanbul day boundaries independent from the process timezone", () => {
    const period = resolveReportPeriod({
      from: "2026-01-01",
      to: "2026-01-01",
      now: new Date("2026-01-01T00:30:00.000Z"),
    });
    expect(period.from.toISOString()).toBe("2025-12-31T21:00:00.000Z");
    expect(period.toExclusive.toISOString()).toBe("2026-01-01T21:00:00.000Z");
    expect(period.fromInput).toBe("2026-01-01");
  });

  it("rejects invalid and oversized periods", () => {
    expect(() => resolveReportPeriod({ from: "2026-07-10", to: "2026-07-01" })).toThrow("Başlangıç");
    expect(() => resolveReportPeriod({ from: "2025-01-01", to: "2026-07-01" })).toThrow("366");
    expect(() => resolveReportPeriod({ currency: "TL" })).toThrow("Para birimi");
  });
});
