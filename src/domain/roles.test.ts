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

  it("limits warehouse master data to admin and warehouse operations", () => {
    expect(hasPermission("SUPER_ADMIN", "warehouse.manage")).toBe(true);
    expect(hasPermission("ADMIN", "warehouse.manage")).toBe(true);
    expect(hasPermission("WAREHOUSE_STAFF", "warehouse.manage")).toBe(true);
    expect(hasPermission("SALES_MANAGER", "warehouse.manage")).toBe(false);
    expect(hasPermission("SALES_STAFF", "warehouse.manage")).toBe(false);
  });

  it("limits warehouse transfers to inventory operators", () => {
    expect(hasPermission("SUPER_ADMIN", "stock.transfer")).toBe(true);
    expect(hasPermission("ADMIN", "stock.transfer")).toBe(true);
    expect(hasPermission("WAREHOUSE_STAFF", "stock.transfer")).toBe(true);
    expect(hasPermission("SALES_MANAGER", "stock.transfer")).toBe(false);
    expect(hasPermission("SALES_STAFF", "stock.transfer")).toBe(false);
  });

  it("keeps company-wide access revocation out of sales roles", () => {
    expect(hasPermission("ADMIN", "company.lifecycle.manage")).toBe(true);
    expect(hasPermission("SALES_MANAGER", "company.lifecycle.manage")).toBe(false);
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
