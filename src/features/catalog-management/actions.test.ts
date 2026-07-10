import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLogCreate: vi.fn(),
  productCompatibilityCreate: vi.fn(),
  productCompatibilityDelete: vi.fn(),
  productCompatibilityFindFirst: vi.fn(),
  productCompatibilityFindMany: vi.fn(),
  productCompatibilityUpdate: vi.fn(),
  requireAdminUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  requireAdminUser: mocks.requireAdminUser,
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
  },
}));

import { deleteProductCompatibility, saveProductCompatibility } from "./actions";

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
    mocks.requireAdminUser.mockResolvedValue({ id: "admin-1" });
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
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/katalog");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/urunler/product-1");
  });
});
