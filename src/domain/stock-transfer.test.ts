import { describe, expect, it } from "vitest";

import {
  getStockTransferNumber,
  getStockTransferPayloadHash,
  stockTransferFormSchema,
} from "./stock-transfer";

const base = {
  productId: "product-1",
  sourceWarehouseCode: "MERKEZ",
  destinationWarehouseCode: "ANKARA",
  quantity: 4,
  reason: "Ankara deposu satış ihtiyacı için transfer.",
  idempotencyKey: "44a52a1f-8dc4-4f88-aafe-b5f777df9c91",
};

describe("stock transfer contract", () => {
  it("accepts a positive transfer between distinct warehouses", () => {
    expect(stockTransferFormSchema.parse(base)).toMatchObject({
      quantity: 4,
      sourceWarehouseCode: "MERKEZ",
      destinationWarehouseCode: "ANKARA",
    });
  });

  it("rejects the same source and destination warehouse", () => {
    expect(() =>
      stockTransferFormSchema.parse({
        ...base,
        destinationWarehouseCode: "MERKEZ",
      }),
    ).toThrow("Kaynak ve hedef depo farklı olmalıdır.");
  });

  it("binds idempotency comparison to the complete command payload", () => {
    const payload = {
      productId: base.productId,
      sourceWarehouseCode: base.sourceWarehouseCode,
      destinationWarehouseCode: base.destinationWarehouseCode,
      quantity: base.quantity,
      reason: base.reason,
    };
    expect(getStockTransferPayloadHash(payload, "actor-1")).not.toBe(
      getStockTransferPayloadHash({ ...payload, quantity: 5 }, "actor-1"),
    );
    expect(getStockTransferPayloadHash(payload, "actor-1")).not.toBe(
      getStockTransferPayloadHash(payload, "actor-2"),
    );
    expect(getStockTransferNumber(base.idempotencyKey)).toBe(
      "TRF-44A52A1F8DC44F88AAFEB5F777DF9C91",
    );
  });
});
