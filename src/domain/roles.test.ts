import { describe, expect, it } from "vitest";

import { hasPermission, isAdminRole, roles } from "./roles";

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

  it("separates internal admin roles from dealer roles", () => {
    expect(isAdminRole("SALES_STAFF")).toBe(true);
    expect(isAdminRole("DEALER_OWNER")).toBe(false);
  });
});
