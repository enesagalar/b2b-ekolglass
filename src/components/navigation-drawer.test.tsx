import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NavigationDrawer } from "@/components/navigation-drawer";

afterEach(() => {
  document.body.style.overflow = "";
});

describe("NavigationDrawer", () => {
  it("stays out of the accessibility tree while closed", () => {
    render(
      <NavigationDrawer open={false} onClose={vi.fn()} ariaLabel="Test menüsü">
        <a href="/test">Test bağlantısı</a>
      </NavigationDrawer>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("locks scrolling, focuses close, and closes with Escape", () => {
    const onClose = vi.fn();
    render(
      <NavigationDrawer open onClose={onClose} ariaLabel="Test menüsü">
        <a href="/test">Test bağlantısı</a>
      </NavigationDrawer>,
    );

    const dialog = screen.getByRole("dialog", { name: "Test menüsü" });
    const closeButton = dialog.querySelector<HTMLButtonElement>("button");
    expect(closeButton).not.toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
