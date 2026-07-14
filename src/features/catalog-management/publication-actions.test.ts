import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLogCreateMany: vi.fn(),
  productFindMany: vi.fn(),
  productUpdateMany: vi.fn(),
  requirePermissionUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback) => callback({
      product: {
        findMany: mocks.productFindMany,
        updateMany: mocks.productUpdateMany,
      },
      auditLog: { createMany: mocks.auditLogCreateMany },
    })),
  },
}));

import { publishReadyProducts } from "./publication-actions";

const readyProduct = (id: string, code: string) => ({
  id,
  code,
  prices: [{
    priceList: {
      companyId: null,
      customerGroupId: null,
      isActive: true,
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: null,
    },
  }],
  stockItems: [{ quantity: 10, reservedQuantity: 2 }],
});

function publicationForm(...productIds: string[]) {
  const formData = new FormData();
  productIds.forEach((productId) => formData.append("productIds", productId));
  return formData;
}

describe("bulk product publication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermissionUser.mockResolvedValue({ id: "admin-1" });
    mocks.productUpdateMany.mockResolvedValue({ count: 2 });
    mocks.auditLogCreateMany.mockResolvedValue({ count: 2 });
  });

  it("publishes all selected ready drafts and records each product", async () => {
    mocks.productFindMany.mockResolvedValue([
      readyProduct("product-1", "E-001"),
      readyProduct("product-2", "E-002"),
    ]);

    const state = await publishReadyProducts(
      { ok: false, message: "" },
      publicationForm("product-1", "product-2"),
    );

    expect(state).toEqual({ ok: true, message: "2 ürün yayına alındı." });
    expect(mocks.requirePermissionUser).toHaveBeenCalledWith(
      "product.manage",
      "/admin/urunler/yayin-hazirligi",
    );
    expect(mocks.productUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["product-1", "product-2"] }, status: "DRAFT" },
      data: { status: "ACTIVE" },
    });
    expect(mocks.auditLogCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          actorUserId: "admin-1",
          action: "product.published",
          entityId: "product-1",
        }),
      ]),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/urunler");
  });

  it("fails closed when a selected product no longer has publication stock", async () => {
    mocks.productFindMany.mockResolvedValue([
      {
        ...readyProduct("product-1", "E-001"),
        stockItems: [{ quantity: 2, reservedQuantity: 2 }],
      },
    ]);

    const state = await publishReadyProducts(
      { ok: false, message: "" },
      publicationForm("product-1"),
    );

    expect(state.ok).toBe(false);
    expect(state.message).toContain("E-001");
    expect(state.message).toContain("Hiçbir ürün yayınlanmadı");
    expect(mocks.productUpdateMany).not.toHaveBeenCalled();
    expect(mocks.auditLogCreateMany).not.toHaveBeenCalled();
  });

  it("rejects a stale selection if a product is missing or no longer a draft", async () => {
    mocks.productFindMany.mockResolvedValue([readyProduct("product-1", "E-001")]);

    const state = await publishReadyProducts(
      { ok: false, message: "" },
      publicationForm("product-1", "product-2"),
    );

    expect(state.ok).toBe(false);
    expect(state.message).toContain("artık taslak değil");
    expect(mocks.productUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects empty and oversized selections before opening a transaction", async () => {
    const emptyState = await publishReadyProducts(
      { ok: false, message: "" },
      publicationForm(),
    );
    const oversizedState = await publishReadyProducts(
      { ok: false, message: "" },
      publicationForm(...Array.from({ length: 51 }, (_, index) => `product-${index}`)),
    );

    expect(emptyState.message).toContain("en az bir ürün");
    expect(oversizedState.message).toContain("en fazla 50 ürün");
    expect(mocks.productFindMany).not.toHaveBeenCalled();
  });
});
