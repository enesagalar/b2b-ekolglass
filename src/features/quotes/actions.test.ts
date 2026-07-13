import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  submit: vi.fn(),
  dealerContext: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/data/dealer-context", () => ({ requireDealerContext: mocks.dealerContext }));
vi.mock("@/data/quote-cart", () => ({
  addQuoteCartProduct: mocks.add,
  removeQuoteCartProduct: vi.fn(),
  submitQuoteCart: mocks.submit,
  updateQuoteCartProduct: vi.fn(),
}));

import { addQuoteCartItemAction, submitQuoteCartAction } from "./actions";

describe("disabled B2B quote creation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects quote cart additions before authentication or database access", async () => {
    const result = await addQuoteCartItemAction({}, new FormData());
    expect(result.message).toContain("kapatildi");
    expect(mocks.dealerContext).not.toHaveBeenCalled();
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("rejects quote submission before database access", async () => {
    const result = await submitQuoteCartAction({}, new FormData());
    expect(result.message).toContain("kapatildi");
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
