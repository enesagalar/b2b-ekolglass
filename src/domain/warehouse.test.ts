import { describe, expect, it } from "vitest";

import { normalizeWarehouseCode, warehouseFormSchema } from "./warehouse";

describe("warehouse domain", () => {
  it("normalizes warehouse codes", () => {
    expect(normalizeWarehouseCode("  merkez_2 ")).toBe("MERKEZ_2");
  });

  it("accepts a valid warehouse form", () => {
    const parsed = warehouseFormSchema.parse({
      code: " merkez ",
      name: "Merkez Depo",
      city: "İstanbul",
      countryCode: "tr",
      isActive: "on",
    });

    expect(parsed).toMatchObject({
      code: "MERKEZ",
      name: "Merkez Depo",
      city: "İstanbul",
      countryCode: "TR",
      isActive: true,
    });
  });

  it("rejects unsafe or stale edit input", () => {
    expect(warehouseFormSchema.safeParse({
      id: "warehouse-1",
      code: "MER KEZ",
      name: "Merkez",
      countryCode: "TR",
      isActive: true,
    }).success).toBe(false);
  });
});
