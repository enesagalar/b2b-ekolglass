import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  revalidatePathsBestEffort: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));
vi.mock("@/lib/cache-revalidation", () => ({
  revalidatePathsBestEffort: mocks.revalidatePathsBestEffort,
}));

import { prisma } from "@/lib/prisma";

import { saveWarehouse } from "./actions";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const actorId = `warehouse-actor-${suffix}`;
const categoryId = `warehouse-category-${suffix}`;
const productId = `warehouse-product-${suffix}`;
const warehouseCode = `WH${String(Date.now()).slice(-8)}`;
const secondWarehouseCode = `${warehouseCode}B`;
let warehouseId = "";

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("warehouse management with SQLite", () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: actorId,
        email: `${suffix}@warehouse.example`,
        name: "Warehouse Test",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    mocks.requirePermissionUser.mockResolvedValue({ id: actorId });
  });

  afterAll(async () => {
    await prisma.stockItem.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.warehouse.deleteMany({
      where: { code: { in: [warehouseCode, secondWarehouseCode] } },
    });
    await prisma.user.deleteMany({ where: { id: actorId } });
  });

  it("creates normalized warehouse master records", async () => {
    const result = await saveWarehouse(form({
      code: warehouseCode.toLowerCase(),
      name: "Test Deposu",
      city: "İstanbul",
      countryCode: "TR",
      isActive: "on",
    }));

    expect(result.ok).toBe(true);
    const warehouse = await prisma.warehouse.findUniqueOrThrow({
      where: { code: warehouseCode },
    });
    warehouseId = warehouse.id;
    expect(warehouse).toMatchObject({
      code: warehouseCode,
      name: "Test Deposu",
      city: "İstanbul",
      isActive: true,
    });
    expect(await prisma.auditLog.findFirst({
      where: {
        actorUserId: actorId,
        action: "warehouse.created",
        entityId: warehouse.id,
      },
    })).toBeTruthy();

    await saveWarehouse(form({
      code: secondWarehouseCode,
      name: "İkinci Test Deposu",
      countryCode: "TR",
      isActive: "on",
    }));
  });

  it("rejects unknown warehouse codes at the database boundary", async () => {
    await prisma.productCategory.create({
      data: {
        id: categoryId,
        slug: `warehouse-${suffix}`,
        name: "Warehouse Test",
      },
    });
    await prisma.product.create({
      data: {
        id: productId,
        code: `W${String(Date.now()).slice(-8)}`,
        name: "Warehouse Test Product",
        categoryId,
        glassType: "Temperli",
      },
    });

    await expect(prisma.stockItem.create({
      data: {
        productId,
        warehouseCode: "UNKNOWN-WAREHOUSE",
        quantity: 1,
      },
    })).rejects.toMatchObject({ code: "P2003" });
  });

  it("keeps a stocked warehouse active and rolls back the edit", async () => {
    await prisma.stockItem.create({
      data: {
        productId,
        warehouseCode,
        quantity: 4,
        reservedQuantity: 1,
      },
    });
    const current = await prisma.warehouse.findUniqueOrThrow({
      where: { id: warehouseId },
    });

    const result = await saveWarehouse(form({
      id: current.id,
      expectedUpdatedAt: current.updatedAt.toISOString(),
      code: current.code,
      name: current.name,
      countryCode: current.countryCode,
    }));

    expect(result.ok).toBe(false);
    expect(result.message).toContain("stoğu bulunan depo pasife alınamaz");
    expect(await prisma.warehouse.findUniqueOrThrow({
      where: { id: current.id },
    })).toMatchObject({ isActive: true });
    expect(await prisma.auditLog.count({
      where: {
        actorUserId: actorId,
        action: "warehouse.updated",
        entityId: current.id,
      },
    })).toBe(0);
  });
});
