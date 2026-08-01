import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CatalogImage } from "@/features/commerce/catalog-image";

describe("CatalogImage", () => {
  it("keeps customer-hosted media outside the image proxy", () => {
    render(
      <div className="relative h-40 w-40">
        <CatalogImage
          src="https://media.example.com/glass.webp"
          alt="Ön cam"
          sizes="160px"
        />
      </div>,
    );

    const image = screen.getByRole("img", { name: "Ön cam" });
    expect(image.getAttribute("src")).toBe("https://media.example.com/glass.webp");
    expect(image.getAttribute("srcset")).toBeNull();
  });

  it("uses the Next.js optimizer for portal-hosted media", () => {
    render(
      <div className="relative h-40 w-40">
        <CatalogImage src="/media/glass.webp" alt="Yan cam" sizes="160px" />
      </div>,
    );

    const image = screen.getByRole("img", { name: "Yan cam" });
    expect(image.getAttribute("src")).toContain("/_next/image?url=%2Fmedia%2Fglass.webp");
    expect(image.getAttribute("srcset")).not.toBeNull();
  });
});
