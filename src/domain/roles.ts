export const roles = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES_MANAGER",
  "SALES_STAFF",
  "WAREHOUSE_STAFF",
  "ACCOUNTING_STAFF",
  "DEALER_OWNER",
  "DEALER_STAFF",
  "PENDING_CUSTOMER",
  "GUEST",
] as const;

export type Role = (typeof roles)[number];

export function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "Süper yönetici",
    ADMIN: "Yönetici",
    SALES_MANAGER: "Satış yöneticisi",
    SALES_STAFF: "Satış çalışanı",
    WAREHOUSE_STAFF: "Depo çalışanı",
    ACCOUNTING_STAFF: "Muhasebe çalışanı",
    DEALER_OWNER: "Bayi yöneticisi",
    DEALER_STAFF: "Bayi çalışanı",
    PENDING_CUSTOMER: "Onay bekleyen müşteri",
    GUEST: "Ziyaretçi",
  };

  return labels[role] ?? role;
}

export const permissions = [
  "admin.dashboard.read",
  "admin.content.manage",
  "dealer.application.review",
  "company.manage",
  "company.user.manage",
  "company.user.credentials.manage",
  "product.manage",
  "product.read",
  "price.read",
  "price.manage",
  "stock.read.detailed",
  "stock.manage",
  "quote.create",
  "quote.review",
  "quote.price",
  "quote.send",
  "quote.approve",
  "quote.convert",
  "quote.cancel",
  "order.create",
  "order.review",
  "order.approve",
  "order.credit.override",
  "order.fulfill",
  "order.ship",
  "order.deliver",
  "order.hold",
  "order.cancel",
  "order.cancel.fulfillment",
  "order.track",
  "report.read",
  "integration.read",
  "integration.replay",
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: [...permissions],
  ADMIN: [
    "admin.dashboard.read",
    "admin.content.manage",
    "dealer.application.review",
    "company.manage",
    "company.user.manage",
    "company.user.credentials.manage",
    "product.manage",
    "product.read",
    "price.read",
    "price.manage",
    "stock.read.detailed",
    "stock.manage",
    "quote.review",
    "quote.price",
    "quote.send",
    "quote.approve",
    "quote.convert",
    "quote.cancel",
    "order.review",
    "order.approve",
    "order.credit.override",
    "order.fulfill",
    "order.ship",
    "order.deliver",
    "order.hold",
    "order.cancel",
    "order.cancel.fulfillment",
    "order.track",
    "report.read",
    "integration.read",
    "integration.replay",
  ],
  SALES_MANAGER: [
    "admin.dashboard.read",
    "dealer.application.review",
    "company.manage",
    "product.read",
    "price.read",
    "price.manage",
    "stock.read.detailed",
    "quote.review",
    "quote.price",
    "quote.send",
    "quote.approve",
    "quote.convert",
    "quote.cancel",
    "order.review",
    "order.approve",
    "order.credit.override",
    "order.hold",
    "order.cancel",
    "order.track",
    "report.read",
    "integration.read",
  ],
  SALES_STAFF: [
    "admin.dashboard.read",
    "product.read",
    "price.read",
    "stock.read.detailed",
    "quote.review",
    "quote.price",
    "quote.send",
    "order.review",
    "order.track",
  ],
  WAREHOUSE_STAFF: [
    "product.read",
    "stock.read.detailed",
    "stock.manage",
    "order.fulfill",
    "order.ship",
    "order.deliver",
    "order.track",
  ],
  ACCOUNTING_STAFF: [
    "admin.dashboard.read",
    "price.read",
    "order.track",
    "report.read",
  ],
  DEALER_OWNER: [
    "product.read",
    "price.read",
    "order.create",
    "order.track",
  ],
  DEALER_STAFF: [
    "product.read",
    "price.read",
    "order.create",
    "order.track",
  ],
  PENDING_CUSTOMER: ["product.read"],
  GUEST: ["product.read"],
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function isKnownRole(value: string | null | undefined): value is Role {
  return roles.includes(value as Role);
}

export function isAdminRole(role: Role) {
  return [
    "SUPER_ADMIN",
    "ADMIN",
    "SALES_MANAGER",
    "SALES_STAFF",
    "WAREHOUSE_STAFF",
    "ACCOUNTING_STAFF",
  ].includes(role);
}

export function isDealerRole(role: Role) {
  return role === "DEALER_OWNER" || role === "DEALER_STAFF";
}
