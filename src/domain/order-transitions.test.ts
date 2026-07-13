import { describe, expect, it } from "vitest";

import {
  canTransitionOrder,
  getAllowedOrderTransitions,
  isOrderStatus,
  orderStatusTransitions,
  type OrderStatus,
} from "@/domain/order-transitions";
import { orderStatuses } from "@/domain/statuses";

const expectedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: [],
  SUBMITTED: ["WAITING_FOR_APPROVAL", "ON_HOLD", "CANCELLED"],
  WAITING_FOR_APPROVAL: ["CONFIRMED", "ON_HOLD", "CANCELLED"],
  CONFIRMED: ["PREPARING", "ON_HOLD", "CANCELLED"],
  PREPARING: ["IN_PRODUCTION", "READY_FOR_SHIPMENT", "ON_HOLD", "CANCELLED"],
  IN_PRODUCTION: ["READY_FOR_SHIPMENT", "ON_HOLD", "CANCELLED"],
  READY_FOR_SHIPMENT: ["SHIPPED", "ON_HOLD", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  ON_HOLD: ["CANCELLED"],
};

describe("order status transitions", () => {
  it("exposes the complete allowed transition matrix", () => {
    expect(orderStatusTransitions).toEqual(expectedTransitions);

    for (const fromStatus of orderStatuses) {
      expect(getAllowedOrderTransitions(fromStatus)).toEqual(
        expectedTransitions[fromStatus],
      );
      for (const toStatus of orderStatuses) {
        expect(canTransitionOrder(fromStatus, toStatus)).toBe(
          expectedTransitions[fromStatus].includes(toStatus),
        );
      }
    }
  });

  it("rejects forbidden, self, terminal, and unknown transitions", () => {
    expect(canTransitionOrder("DRAFT", "SHIPPED")).toBe(false);
    expect(canTransitionOrder("CONFIRMED", "CONFIRMED")).toBe(false);
    expect(canTransitionOrder("DELIVERED", "CANCELLED")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "SUBMITTED")).toBe(false);
    expect(canTransitionOrder("UNKNOWN", "SUBMITTED")).toBe(false);
    expect(canTransitionOrder("DRAFT", "UNKNOWN")).toBe(false);
    expect(getAllowedOrderTransitions("UNKNOWN")).toEqual([]);
    expect(isOrderStatus("UNKNOWN")).toBe(false);
  });

  it("only resumes an on-hold order to its recorded previous status or cancellation", () => {
    expect(getAllowedOrderTransitions("ON_HOLD", "PREPARING")).toEqual([
      "PREPARING",
      "CANCELLED",
    ]);
    expect(canTransitionOrder("ON_HOLD", "PREPARING", "PREPARING")).toBe(true);
    expect(canTransitionOrder("ON_HOLD", "CONFIRMED", "PREPARING")).toBe(false);
    expect(getAllowedOrderTransitions("ON_HOLD", "ON_HOLD")).toEqual([
      "CANCELLED",
    ]);
    expect(getAllowedOrderTransitions("ON_HOLD", "UNKNOWN")).toEqual([
      "CANCELLED",
    ]);
  });
});
