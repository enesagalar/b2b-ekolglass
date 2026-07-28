import { describe, expect, it } from "vitest";

import {
  adminQuoteArchiveScopes,
  getAdminQuoteArchiveStatuses,
  getAdminQuoteArchiveTask,
  resolveAdminQuoteArchiveScope,
} from "./admin-quote-archive";
import { quoteStatuses } from "./statuses";

describe("admin quote archive", () => {
  it("assigns every quote status to exactly one archive group", () => {
    const grouped = adminQuoteArchiveScopes
      .filter((scope) => scope !== "ALL")
      .flatMap((scope) => getAdminQuoteArchiveStatuses(scope));

    expect(grouped.toSorted()).toEqual([...quoteStatuses].toSorted());
    expect(new Set(grouped).size).toBe(quoteStatuses.length);
  });

  it("resolves unknown groups safely and describes converted order trace", () => {
    expect(resolveAdminQuoteArchiveScope("UNKNOWN")).toBe("ALL");
    expect(
      getAdminQuoteArchiveTask("CONVERTED_TO_ORDER", "SIP-2026-42"),
    ).toMatchObject({
      title: "Sipariş izini aç",
      detail: expect.stringContaining("SIP-2026-42"),
      tone: "success",
    });
  });
});
