import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  revalidatePathsBestEffort: vi.fn(),
  transaction: vi.fn(),
  warehouseCreate: vi.fn(),
  warehouseFindUnique: vi.fn(),
  warehouseUpdate: vi.fn(),
  warehouseCount: vi.fn(),
  stockAggregate: vi.fn(),
  auditCreate: vi.fn(),
  checkoutLockUpsert: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));
vi.mock("@/lib/cache-revalidation", () => ({
  revalidatePathsBestEffort: mocks.revalidatePathsBestEffort,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { saveWarehouse } from "./actions";

function warehouseForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("code", "merkez-2");
  formData.set("name", "İkinci Depo");
  formData.set("city", "İstanbul");
  formData.set("countryCode", "TR");
  formData.set("isActive", "on");
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

describe("warehouse management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermissionUser.mockResolvedValue({ id: "admin-1" });
    mocks.warehouseCount.mockResolvedValue(2);
    mocks.stockAggregate.mockResolvedValue({
      _sum: { quantity: 0, reservedQuantity: 0 },
    });
    mocks.auditCreate.mockResolvedValue({});
    mocks.checkoutLockUpsert.mockResolvedValue({
      id: "stock-mutations",
      version: 1,
    });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        checkoutLock: { upsert: mocks.checkoutLockUpsert },
        warehouse: {
          create: mocks.warehouseCreate,
          findUnique: mocks.warehouseFindUnique,
          update: mocks.warehouseUpdate,
          count: mocks.warehouseCount,
        },
        stockItem: { aggregate: mocks.stockAggregate },
        auditLog: { create: mocks.auditCreate },
      }),
    );
  });

  it("requires warehouse master permission", async () => {
    await saveWarehouse(new FormData());

    expect(mocks.requirePermissionUser).toHaveBeenCalledWith(
      "warehouse.manage",
      "/admin/stok/depolar",
    );
  });

  it("creates a normalized warehouse and audit entry", async () => {
    mocks.warehouseCreate.mockResolvedValue({
      id: "warehouse-2",
      code: "MERKEZ-2",
      name: "İkinci Depo",
      isActive: true,
    });

    const result = await saveWarehouse(warehouseForm());

    expect(result).toEqual({ ok: true, message: "İkinci Depo oluşturuldu." });
    expect(mocks.warehouseCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "MERKEZ-2",
        name: "İkinci Depo",
        isActive: true,
      }),
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "warehouse.created",
        entityType: "Warehouse",
        entityId: "warehouse-2",
      }),
    });
  });

  it("does not deactivate a warehouse that still has stock", async () => {
    const updatedAt = new Date("2026-07-27T12:00:00.000Z");
    mocks.warehouseFindUnique.mockResolvedValue({
      id: "warehouse-1",
      code: "MERKEZ",
      name: "Merkez Depo",
      isActive: true,
      updatedAt,
    });
    mocks.stockAggregate.mockResolvedValue({
      _sum: { quantity: 5, reservedQuantity: 1 },
    });

    const result = await saveWarehouse(warehouseForm({
      id: "warehouse-1",
      code: "MERKEZ",
      name: "Merkez Depo",
      expectedUpdatedAt: updatedAt.toISOString(),
      isActive: "false",
    }));

    expect(result.ok).toBe(false);
    expect(result.message).toContain("stoğu bulunan depo pasife alınamaz");
    expect(mocks.warehouseUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
