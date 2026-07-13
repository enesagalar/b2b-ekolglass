import type { Permission } from "@/domain/roles";
import { orderStatuses } from "@/domain/statuses";

export type OrderStatus = (typeof orderStatuses)[number];

export const orderStatusTransitions: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
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

export function isOrderStatus(value: string): value is OrderStatus {
  return orderStatuses.includes(value as OrderStatus);
}

export function getAllowedOrderTransitions(
  status: string,
  heldFromStatus?: string | null,
): readonly OrderStatus[] {
  if (!isOrderStatus(status)) return [];
  if (status !== "ON_HOLD") return orderStatusTransitions[status];
  return heldFromStatus &&
    isOrderStatus(heldFromStatus) &&
    heldFromStatus !== "ON_HOLD"
    ? [heldFromStatus, "CANCELLED"]
    : ["CANCELLED"];
}

export function canTransitionOrder(
  fromStatus: string,
  toStatus: string,
  heldFromStatus?: string | null,
) {
  return (
    isOrderStatus(toStatus) &&
    getAllowedOrderTransitions(fromStatus, heldFromStatus).includes(toStatus)
  );
}

export function getOrderTransitionPermission(
  fromStatus: string,
  toStatus: OrderStatus,
): Permission {
  if (toStatus === "CANCELLED") {
    return [
      "CONFIRMED",
      "PREPARING",
      "IN_PRODUCTION",
      "READY_FOR_SHIPMENT",
    ].includes(fromStatus)
      ? "order.cancel.fulfillment"
      : "order.cancel";
  }
  if (toStatus === "ON_HOLD" || fromStatus === "ON_HOLD") return "order.hold";
  if (toStatus === "WAITING_FOR_APPROVAL") return "order.review";
  if (toStatus === "CONFIRMED") return "order.approve";
  if (["PREPARING", "IN_PRODUCTION", "READY_FOR_SHIPMENT"].includes(toStatus))
    return "order.fulfill";
  if (toStatus === "SHIPPED") return "order.ship";
  if (toStatus === "DELIVERED") return "order.deliver";
  return "order.track";
}
