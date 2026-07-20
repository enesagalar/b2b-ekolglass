import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addOrderCartProduct: vi.fn(),
  removeOrderCartProduct: vi.fn(),
  requireDealerContext: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
  submitOrderCart: vi.fn(),
  updateOrderCartProduct: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/data/dealer-context", () => ({
  requireDealerContext: mocks.requireDealerContext,
}));
vi.mock("@/data/order-cart", () => ({
  OrderCartError: class OrderCartError extends Error {},
  addOrderCartProduct: mocks.addOrderCartProduct,
  removeOrderCartProduct: mocks.removeOrderCartProduct,
  submitOrderCart: mocks.submitOrderCart,
  updateOrderCartProduct: mocks.updateOrderCartProduct,
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { OrderCartError } from "@/data/order-cart";
import { submitOrderCartAction } from "@/features/orders/actions";

function submitForm(overrides: Record<string, string> = {}) {
  const data = new FormData();
  data.set("cartId", "cart-1");
  data.set("cartVersion", "4");
  data.set("deliveryAddressId", "address-1");
  data.set("shipmentMethod", "CUSTOMER_PICKUP");
  data.set("notes", "Warehouse pickup");
  data.set("idempotencyKey", "11111111-1111-4111-8111-111111111111");
  for (const [key, value] of Object.entries(overrides)) data.set(key, value);
  return data;
}

describe("dealer order submit action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireDealerContext.mockResolvedValue({
      user: { id: "dealer-1", role: "DEALER_OWNER" },
      company: {
        id: "company-1",
        customerGroup: { id: "group-1" },
        discountRate: { toString: () => "12.5" },
      },
    });
    mocks.submitOrderCart.mockResolvedValue({ id: "order-1" });
  });

  it("rejects invalid input before authentication and order access", async () => {
    const result = await submitOrderCartAction(
      { ok: false, message: "" },
      submitForm({ idempotencyKey: "invalid" }),
    );

    expect(result.message).toBe("Gönderim anahtarı geçersiz.");
    expect(mocks.requireDealerContext).not.toHaveBeenCalled();
    expect(mocks.submitOrderCart).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each(["unauthenticated", "non-dealer role"])("preserves the %s redirect boundary", async () => {
    mocks.requireDealerContext.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(submitOrderCartAction(
      { ok: false, message: "" },
      submitForm(),
    )).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.requireDealerContext).toHaveBeenCalledWith("/sepet");
    expect(mocks.submitOrderCart).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("delegates a valid submit and refreshes dealer order surfaces before redirect", async () => {
    await expect(
      submitOrderCartAction({ ok: false, message: "" }, submitForm()),
    ).rejects.toThrow("redirect:/bayi/siparisler/order-1?created=1");

    expect(mocks.requireDealerContext).toHaveBeenCalledWith("/sepet");
    expect(mocks.submitOrderCart).toHaveBeenCalledWith(
      {
        userId: "dealer-1",
        companyId: "company-1",
        customerGroupId: "group-1",
        discountRate: "12.5",
        role: "DEALER_OWNER",
      },
      {
        cartId: "cart-1",
        cartVersion: 4,
        deliveryAddressId: "address-1",
        shipmentMethod: "CUSTOMER_PICKUP",
        notes: "Warehouse pickup",
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
      },
    );
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/bayi"],
      ["/bayi/siparisler"],
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/bayi/siparisler/order-1?created=1",
    );
    expect(mocks.submitOrderCart.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.revalidatePath.mock.invocationCallOrder[0]!,
    );
    expect(mocks.revalidatePath.mock.invocationCallOrder[1]).toBeLessThan(
      mocks.redirect.mock.invocationCallOrder[0]!,
    );
  });

  it("maps a supported domain error without post-submit side effects", async () => {
    mocks.submitOrderCart.mockRejectedValue(
      new OrderCartError("Sipariş sepetiniz boş."),
    );

    const result = await submitOrderCartAction(
      { ok: false, message: "" },
      submitForm(),
    );

    expect(result).toEqual({ message: "Sipariş sepetiniz boş." });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("uses a generic message for unknown failures without exposing their payload", async () => {
    const internalPayload = {
      databaseUrl: "file:production-secret.db",
      query: "SELECT secret FROM credentials",
    };
    mocks.submitOrderCart.mockRejectedValue(internalPayload);

    const result = await submitOrderCartAction(
      { ok: false, message: "" },
      submitForm(),
    );

    expect(result).toEqual({ message: "İşlem tamamlanamadı." });
    expect(JSON.stringify(result)).not.toContain("production-secret");
    expect(JSON.stringify(result)).not.toContain("credentials");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("does not expose unexpected Error details", async () => {
    mocks.submitOrderCart.mockRejectedValue(new Error("SQLITE_CONSTRAINT at secret_table"));

    const result = await submitOrderCartAction({ ok: false, message: "" }, submitForm());

    expect(result).toEqual({ message: "İşlem tamamlanamadı." });
    expect(JSON.stringify(result)).not.toContain("SQLITE_CONSTRAINT");
    expect(JSON.stringify(result)).not.toContain("secret_table");
  });
});
