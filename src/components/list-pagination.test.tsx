import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ListPagination } from "./list-pagination";

describe("ListPagination", () => {
  it("renders unavailable directions as non-links", () => {
    render(
      <ListPagination
        page={1}
        totalPages={1}
        previousHref="/onceki"
        nextHref="/sonraki"
        ariaLabel="Test sayfalari"
      />,
    );

    expect(screen.getByRole("navigation", { name: "Test sayfalari" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Önceki" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sonraki" })).toBeNull();
    expect(screen.getAllByText(/Önceki|Sonraki/)).toHaveLength(2);
  });

  it("keeps active directions as links with supplied query state", () => {
    render(
      <ListPagination
        page={2}
        totalPages={3}
        previousHref="/kayitlar?q=cam&page=1"
        nextHref="/kayitlar?q=cam&page=3"
        ariaLabel="Test sayfalari"
      />,
    );

    expect(screen.getByRole("link", { name: "Önceki" }).getAttribute("href")).toBe("/kayitlar?q=cam&page=1");
    expect(screen.getByRole("link", { name: "Sonraki" }).getAttribute("href")).toBe("/kayitlar?q=cam&page=3");
  });
});
