import { describe, expect, it } from "vitest";

import {
  cancelStockCountSchema,
  completeStockCountSchema,
  getStockCountNumber,
  getStockCountPayloadHash,
  openStockCountSchema,
} from "./stock-count";

const idempotencyKey = "44a52a1f-8dc4-4f88-aafe-b5f777df9c91";

describe("stock count contract", () => {
  it("accepts opening and completion commands", () => {
    expect(
      openStockCountSchema.parse({ stockItemId: "stock-1", idempotencyKey }),
    ).toMatchObject({ stockItemId: "stock-1" });
    expect(
      completeStockCountSchema.parse({
        sessionId: "session-1",
        countedQuantity: "0",
        reason: "Rafların tamamı fiziksel olarak sayıldı.",
        idempotencyKey,
      }),
    ).toMatchObject({ countedQuantity: 0 });
  });

  it("requires an accountable cancellation reason", () => {
    expect(() =>
      cancelStockCountSchema.parse({
        sessionId: "session-1",
        reason: "kısa",
        idempotencyKey,
      }),
    ).toThrow("Operasyon gerekçesi en az 10 karakter olmalıdır.");
  });

  it("binds replay identity to operation, actor and payload", () => {
    const payload = { sessionId: "session-1", countedQuantity: 4 };
    expect(getStockCountPayloadHash("COMPLETE", payload, "actor-1")).not.toBe(
      getStockCountPayloadHash("COMPLETE", payload, "actor-2"),
    );
    expect(getStockCountPayloadHash("COMPLETE", payload, "actor-1")).not.toBe(
      getStockCountPayloadHash("CANCEL", payload, "actor-1"),
    );
    expect(getStockCountNumber(idempotencyKey)).toBe(
      "SYM-44A52A1F8DC44F88AAFEB5F777DF9C91",
    );
  });
});
