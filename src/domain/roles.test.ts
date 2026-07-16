import { describe, expect, it } from "vitest";

import { hasPermission, isAdminRole, isKnownRole, roles } from "./roles";

describe("role permissions", () => {
  it("keeps the expected B2B role surface", () => {
    expect(roles).toContain("SUPER_ADMIN");
    expect(roles).toContain("DEALER_OWNER");
    expect(roles).toContain("WAREHOUSE_STAFF");
  });

  it("allows super admin to manage content", () => {
    expect(hasPermission("SUPER_ADMIN", "admin.content.manage")).toBe(true);
  });

  it("does not allow warehouse staff to manage prices", () => {
    expect(hasPermission("WAREHOUSE_STAFF", "price.manage")).toBe(false);
  });

  it("separates sales approval from warehouse fulfillment", () => {
    expect(hasPermission("SALES_MANAGER", "order.approve")).toBe(true);
    expect(hasPermission("SALES_MANAGER", "order.ship")).toBe(false);
    expect(hasPermission("WAREHOUSE_STAFF", "order.fulfill")).toBe(true);
    expect(hasPermission("WAREHOUSE_STAFF", "order.ship")).toBe(true);
    expect(hasPermission("WAREHOUSE_STAFF", "order.approve")).toBe(false);
    expect(hasPermission("WAREHOUSE_STAFF", "order.cancel")).toBe(false);
  });

  it("keeps stock export limited to operational stock roles", () => {
    expect(hasPermission("ADMIN", "stock.export")).toBe(true);
    expect(hasPermission("SALES_MANAGER", "stock.export")).toBe(true);
    expect(hasPermission("WAREHOUSE_STAFF", "stock.export")).toBe(true);
    expect(hasPermission("ACCOUNTING_STAFF", "stock.export")).toBe(false);
    expect(hasPermission("SALES_STAFF", "stock.export")).toBe(false);
    expect(hasPermission("DEALER_OWNER", "stock.export")).toBe(false);
  });

  it("separates internal admin roles from dealer roles", () => {
    expect(isAdminRole("SALES_STAFF")).toBe(true);
    expect(isAdminRole("DEALER_OWNER")).toBe(false);
  });

  it("narrows unknown persisted role values", () => {
    expect(isKnownRole("DEALER_OWNER")).toBe(true);
    expect(isKnownRole("LEGACY_ROLE")).toBe(false);
  });
});
