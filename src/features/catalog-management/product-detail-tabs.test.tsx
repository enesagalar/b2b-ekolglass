import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductDetailTabs } from "./product-detail-tabs";

describe("ProductDetailTabs", () => {
  it("announces the current section and hides unauthorized sections", () => {
    render(
      <ProductDetailTabs
        productId="product-1"
        activeTab="medya"
        canReadPrice={false}
        canReadStock={false}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Ürün yönetimi bölümleri" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Medya" }).getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("link", { name: "Fiyat" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Stok" })).toBeNull();
  });

  it("keeps permitted stock and price sections in the keyboard navigation order", () => {
    render(
      <ProductDetailTabs
        productId="product-1"
        activeTab="stok"
        canReadPrice
        canReadStock
      />,
    );

    expect(screen.getByRole("link", { name: "Stok" }).getAttribute("href")).toBe(
      "/admin/urunler/product-1?tab=stok",
    );
    expect(screen.getByRole("link", { name: "Fiyat" })).toBeTruthy();
  });
});
