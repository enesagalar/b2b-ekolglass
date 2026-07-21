import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLogCreate: vi.fn(),
  productCompatibilityCreate: vi.fn(),
  productCompatibilityDelete: vi.fn(),
  productCompatibilityFindFirst: vi.fn(),
  productCompatibilityFindMany: vi.fn(),
  productCompatibilityUpdate: vi.fn(),
  requirePermissionUser: vi.fn(),
  revalidatePath: vi.fn(),
  stockItemUpsert: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: mocks.auditLogCreate,
    },
    productCompatibility: {
      create: mocks.productCompatibilityCreate,
      delete: mocks.productCompatibilityDelete,
      findFirst: mocks.productCompatibilityFindFirst,
      findMany: mocks.productCompatibilityFindMany,
      update: mocks.productCompatibilityUpdate,
    },
    stockItem: {
      upsert: mocks.stockItemUpsert,
    },
  },
}));

import {
  deleteProductCompatibility,
  saveCategory,
  savePriceList,
  saveProductBundle,
  saveProductCompatibility,
  saveProductPrice,
  saveProductStock,
} from "./actions";

function compatibilityForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("productId", "product-1");
  formData.set("vehicleBrand", "Fiat");
  formData.set("vehicleModel", "Ducato");
  formData.set("yearStart", "2020");
  formData.set("yearEnd", "2026");
  formData.set("oemReference", "EGL-123");
  formData.set("notes", "Standart uyumluluk");

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

describe("catalog management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermissionUser.mockResolvedValue({ id: "admin-1" });
    mocks.auditLogCreate.mockResolvedValue({});
    mocks.productCompatibilityCreate.mockResolvedValue({
      id: "compatibility-1",
      vehicleBrand: "Fiat",
      vehicleModel: "Ducato",
      oemReference: "EGL-123",
    });
    mocks.productCompatibilityUpdate.mockResolvedValue({
      id: "compatibility-1",
      vehicleBrand: "Fiat",
      vehicleModel: "Ducato",
      oemReference: "EGL-123",
    });
    mocks.productCompatibilityDelete.mockResolvedValue({});
    mocks.productCompatibilityFindFirst.mockResolvedValue(null);
    mocks.productCompatibilityFindMany.mockResolvedValue([]);
    mocks.stockItemUpsert.mockResolvedValue({ id: "stock-1" });
  });

  it.each([
    ["kategori", saveCategory, ["product.manage"]],
    ["fiyat listesi", savePriceList, ["price.manage"]],
    ["urun paketi", saveProductBundle, ["product.manage", "stock.manage", "price.manage"]],
    ["stok", saveProductStock, ["stock.manage"]],
    ["urun fiyati", saveProductPrice, ["price.manage"]],
    ["uyumluluk", saveProductCompatibility, ["product.manage"]],
    ["uyumluluk silme", deleteProductCompatibility, ["product.manage"]],
  ])("%s islemini gereken izinlerle korur", async (_label, action, permissions) => {
    await action(new FormData());

    expect(mocks.requirePermissionUser.mock.calls.map(([permission]) => permission)).toEqual(permissions);
    expect(mocks.requirePermissionUser).toHaveBeenCalledWith(expect.any(String), "/admin/urunler");
  });

  it("rejects duplicate product compatibility records before create", async () => {
    mocks.productCompatibilityFindMany.mockResolvedValue([
      {
        id: "compatibility-existing",
        vehicleBrand: " fiat ",
        vehicleModel: "DUCATO",
        yearStart: 2020,
        yearEnd: 2026,
        oemReference: "egl-123",
      },
    ]);

    const state = await saveProductCompatibility(compatibilityForm());

    expect(state.ok).toBe(false);
    expect(state.message).toContain("zaten kayitli");
    expect(mocks.productCompatibilityCreate).not.toHaveBeenCalled();
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });

  it("creates product compatibility records when duplicate key is absent", async () => {
    const state = await saveProductCompatibility(compatibilityForm());

    expect(state.ok).toBe(true);
    expect(mocks.productCompatibilityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "product-1",
          vehicleBrand: "Fiat",
          vehicleModel: "Ducato",
          yearStart: 2020,
          yearEnd: 2026,
          oemReference: "EGL-123",
        }),
      }),
    );
    expect(mocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "product_compatibility.create",
          actorUserId: "admin-1",
          entityId: "product-1",
        }),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/urunler/product-1");
  });

  it("allows updating the same compatibility record without treating itself as duplicate", async () => {
    mocks.productCompatibilityFindFirst.mockResolvedValue({ id: "compatibility-1" });
    mocks.productCompatibilityFindMany.mockResolvedValue([
      {
        id: "compatibility-1",
        vehicleBrand: "Fiat",
        vehicleModel: "Ducato",
        yearStart: 2020,
        yearEnd: 2026,
        oemReference: "EGL-123",
      },
    ]);

    const state = await saveProductCompatibility(compatibilityForm({ id: "compatibility-1" }));

    expect(state.ok).toBe(true);
    expect(mocks.productCompatibilityUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "compatibility-1" },
      }),
    );
  });

  it("rejects updates that would duplicate another compatibility record", async () => {
    mocks.productCompatibilityFindFirst.mockResolvedValue({ id: "compatibility-1" });
    mocks.productCompatibilityFindMany.mockResolvedValue([
      {
        id: "compatibility-2",
        vehicleBrand: "FIAT",
        vehicleModel: "Ducato",
        yearStart: 2020,
        yearEnd: 2026,
        oemReference: "EGL-123",
      },
    ]);

    const state = await saveProductCompatibility(compatibilityForm({ id: "compatibility-1" }));

    expect(state.ok).toBe(false);
    expect(state.message).toContain("zaten kayitli");
    expect(mocks.productCompatibilityUpdate).not.toHaveBeenCalled();
  });

  it("does not delete compatibility records owned by another product", async () => {
    const state = await deleteProductCompatibility(compatibilityForm({ id: "compatibility-1" }));

    expect(state.ok).toBe(false);
    expect(state.message).toContain("bu urune ait degil");
    expect(mocks.productCompatibilityDelete).not.toHaveBeenCalled();
  });

  it("deletes owned compatibility records with audit and revalidation", async () => {
    mocks.productCompatibilityFindFirst.mockResolvedValue({
      id: "compatibility-1",
      vehicleBrand: "Fiat",
      vehicleModel: "Ducato",
      yearStart: 2020,
      yearEnd: 2026,
      oemReference: "EGL-123",
    });

    const state = await deleteProductCompatibility(compatibilityForm({ id: "compatibility-1" }));

    expect(state.ok).toBe(true);
    expect(mocks.productCompatibilityDelete).toHaveBeenCalledWith({ where: { id: "compatibility-1" } });
    expect(mocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "product_compatibility.delete",
          actorUserId: "admin-1",
          entityId: "product-1",
        }),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/urunler");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/urunler");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/bayi/urunler");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/urunler/product-1");
  });

  it("does not allow an admin form to overwrite the reservation ledger", async () => {
    const formData = new FormData();
    formData.set("productId", "product-1");
    formData.set("warehouseCode", "MERKEZ");
    formData.set("quantity", "12");
    formData.set("reservedQuantity", "999");
    formData.set("visibility", "SIMPLIFIED");
    formData.set("status", "IN_STOCK");

    const state = await saveProductStock(formData);

    expect(state.ok).toBe(true);
    expect(mocks.stockItemUpsert).toHaveBeenCalledWith({
      where: {
        productId_warehouseCode: {
          productId: "product-1",
          warehouseCode: "MERKEZ",
        },
      },
      update: {
        quantity: 12,
        visibility: "SIMPLIFIED",
        status: "IN_STOCK",
      },
      create: {
        productId: "product-1",
        warehouseCode: "MERKEZ",
        quantity: 12,
        reservedQuantity: 0,
        visibility: "SIMPLIFIED",
        status: "IN_STOCK",
      },
    });
  });
});
