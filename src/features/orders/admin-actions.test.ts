import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  transitionOrderStatus: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({
  requirePermissionUser: mocks.requirePermissionUser,
}));
vi.mock("@/data/order-operations", async () => {
  const actual = await vi.importActual<
    typeof import("@/data/order-operations")
  >("@/data/order-operations");
  return { ...actual, transitionOrderStatus: mocks.transitionOrderStatus };
});

import { OrderTransitionError } from "@/data/order-operations";
import { transitionOrderStatusAction } from "@/features/orders/admin-actions";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  data.set("orderId", "order-1");
  data.set("expectedStatus", "SUBMITTED");
  data.set("expectedVersion", "1");
  data.set("targetStatus", "WAITING_FOR_APPROVAL");
  data.set("idempotencyKey", "11111111-1111-4111-8111-111111111111");
  for (const [key, value] of Object.entries(overrides)) data.set(key, value);
  return data;
}

describe("admin order status action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermissionUser.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
    });
    mocks.transitionOrderStatus.mockResolvedValue({
      id: "order-1",
      status: "WAITING_FOR_APPROVAL",
    });
  });

  it("rejects invalid input before permission and data access", async () => {
    const result = await transitionOrderStatusAction(
      { ok: false, message: "" },
      form({ idempotencyKey: "bad" }),
    );
    expect(result.ok).toBe(false);
    expect(mocks.requirePermissionUser).not.toHaveBeenCalled();
    expect(mocks.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it("requires review permission for the submitted review transition", async () => {
    const result = await transitionOrderStatusAction(
      { ok: false, message: "" },
      form(),
    );
    expect(result.ok).toBe(true);
    expect(mocks.requirePermissionUser).toHaveBeenCalledWith(
      "order.review",
      "/admin/siparisler/order-1",
    );
    expect(mocks.transitionOrderStatus).toHaveBeenCalledWith(
      { userId: "admin-1" },
      expect.objectContaining({
        expectedStatus: "SUBMITTED",
        expectedVersion: 1,
        targetStatus: "WAITING_FOR_APPROVAL",
      }),
    );
  });

  it("requires fulfillment cancellation permission after confirmation", async () => {
    await transitionOrderStatusAction(
      { ok: false, message: "" },
      form({
        expectedStatus: "CONFIRMED",
        targetStatus: "CANCELLED",
        note: "Müşteri iptali",
      }),
    );
    expect(mocks.requirePermissionUser).toHaveBeenCalledWith(
      "order.cancel.fulfillment",
      "/admin/siparisler/order-1",
    );
  });

  it("requires the separate credit override permission when a reason is sent", async () => {
    await transitionOrderStatusAction(
      { ok: false, message: "" },
      form({
        expectedStatus: "WAITING_FOR_APPROVAL",
        targetStatus: "CONFIRMED",
        commercialOverrideReason: "Kredi komitesi onayı alındı.",
      }),
    );
    expect(mocks.requirePermissionUser).toHaveBeenNthCalledWith(
      1,
      "order.approve",
      "/admin/siparisler/order-1",
    );
    expect(mocks.requirePermissionUser).toHaveBeenNthCalledWith(
      2,
      "order.credit.override",
      "/admin/siparisler/order-1",
    );
    expect(mocks.transitionOrderStatus).toHaveBeenCalledWith(
      { userId: "admin-1", canOverrideCredit: true },
      expect.objectContaining({
        commercialOverrideReason: "Kredi komitesi onayı alındı.",
      }),
    );
  });

  it("returns an explicit conflict state", async () => {
    mocks.transitionOrderStatus.mockRejectedValue(
      new OrderTransitionError("Sipariş güncellendi.", "CONFLICT"),
    );
    const result = await transitionOrderStatusAction(
      { ok: false, message: "" },
      form(),
    );
    expect(result).toEqual({
      ok: false,
      message: "Sipariş güncellendi.",
      conflict: true,
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates admin and dealer order surfaces after success", async () => {
    await transitionOrderStatusAction({ ok: false, message: "" }, form());
    expect(mocks.revalidatePath.mock.calls.flat()).toEqual(
      expect.arrayContaining([
        "/admin",
        "/admin/siparisler",
        "/admin/siparisler/order-1",
        "/bayi",
        "/bayi/siparisler",
        "/bayi/siparisler/order-1",
      ]),
    );
  });
});
