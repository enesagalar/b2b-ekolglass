import type { ReactElement } from "react";
import { Children } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCompany: vi.fn(),
  getCommerceIdentity: vi.fn(),
  getCurrentUser: vi.fn(),
  getProductDetail: vi.fn(),
  notFound: vi.fn((path?: string): never => {
    throw new Error(`not-found:${path ?? ""}`);
  }),
  permanentRedirect: vi.fn((path: string): never => {
    throw new Error(`permanent-redirect:${path}`);
  }),
  productBrowser: vi.fn(() => null),
  productDetail: vi.fn(() => null),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
  redirect: mocks.redirect,
}));
vi.mock("@/data/commerce", () => ({ getCommerceIdentity: mocks.getCommerceIdentity }));
vi.mock("@/data/product-detail", () => ({ getProductDetail: mocks.getProductDetail }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: { company: { findUnique: mocks.findCompany } },
}));
vi.mock("@/features/auth/login-form", () => ({ LoginForm: () => null }));
vi.mock("@/features/commerce/commerce-header", () => ({
  CommerceFooter: () => null,
  CommerceHeader: () => null,
}));
vi.mock("@/features/commerce/product-browser", () => ({ ProductBrowser: mocks.productBrowser }));
vi.mock("@/features/commerce/product-detail", () => ({ ProductDetail: mocks.productDetail }));

import LegacyQuoteCartPage from "@/app/bayi/teklif-sepeti/page";
import LegacyDealerProductDetailPage from "@/app/bayi/urunler/[id]/page";
import LegacyDealerProductsPage from "@/app/bayi/urunler/page";
import LoginPage from "@/app/giris/page";
import ProductDetailPage from "@/app/urunler/[id]/page";
import ProductsPage from "@/app/urunler/page";

function childByType(element: ReactElement, type: unknown) {
  return Children.toArray(element.props.children).find(
    (child): child is ReactElement => typeof child === "object" && child !== null && "type" in child && child.type === type,
  );
}

describe("public commerce routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCommerceIdentity.mockResolvedValue(null);
  });

  it.each(["DEALER_OWNER", "ADMIN"])("redirects an authenticated %s away from /giris to /", async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", name: "User", role, companyId: role === "DEALER_OWNER" ? "company-1" : null });

    await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("treats an admin on the public product listing as a guest for pricing", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", name: "Admin", role: "SUPER_ADMIN", companyId: null });

    const page = await ProductsPage({ searchParams: Promise.resolve({ q: "cam" }) });
    const browser = childByType(page, mocks.productBrowser);

    expect(browser?.props).toEqual(expect.objectContaining({
      basePath: "/urunler",
      searchParams: { q: "cam" },
      viewer: { role: "GUEST" },
    }));
    expect(mocks.findCompany).not.toHaveBeenCalled();
  });

  it("uses approved dealer pricing context on the public product listing", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "dealer-1", name: "Dealer", role: "DEALER_STAFF", companyId: "company-1" });
    mocks.findCompany.mockResolvedValue({ status: "APPROVED", customerGroupId: "group-1" });

    const page = await ProductsPage({ searchParams: Promise.resolve({}) });
    const browser = childByType(page, mocks.productBrowser);

    expect(browser?.props.viewer).toEqual({
      role: "DEALER_STAFF",
      companyId: "company-1",
      customerGroupId: "group-1",
      discountRate: "0",
    });
  });

  it("does not pass internal admin pricing context to public product details", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", name: "Admin", role: "SALES_MANAGER", companyId: null });
    mocks.getProductDetail.mockResolvedValue({ id: "product-1" });

    await ProductDetailPage({ params: Promise.resolve({ id: "product-1" }) });

    expect(mocks.getProductDetail).toHaveBeenCalledWith("product-1", { role: "GUEST" });
    expect(mocks.findCompany).not.toHaveBeenCalled();
  });
});

describe("legacy dealer commerce redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves supported product listing query parameters", async () => {
    await expect(LegacyDealerProductsPage({
      searchParams: Promise.resolve({ q: "yan cam", category: ["otobus", "ignored"], empty: "" }),
    })).rejects.toThrow("permanent-redirect:/urunler?q=yan+cam&category=otobus");
  });

  it("redirects legacy product details to the public product detail", async () => {
    await expect(LegacyDealerProductDetailPage({ params: Promise.resolve({ id: "product-1" }) }))
      .rejects.toThrow("permanent-redirect:/urunler/product-1");
  });

  it("redirects the legacy quote cart to products", async () => {
    await expect(() => LegacyQuoteCartPage()).toThrow("permanent-redirect:/urunler");
  });
});
