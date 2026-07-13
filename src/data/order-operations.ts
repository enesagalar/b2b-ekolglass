import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import {
  canTransitionOrder,
  type OrderStatus,
} from "@/domain/order-transitions";
import { getStatusLabel } from "@/domain/statuses";
import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/integrations/outbox";

export type OrderTransitionInput = {
  orderId: string;
  expectedStatus: OrderStatus;
  expectedVersion: number;
  targetStatus: OrderStatus;
  idempotencyKey: string;
  note?: string;
  carrier?: string;
  trackingNumber?: string;
};

export type OrderTransitionActor = { userId: string };
export type OrderTransitionErrorCode =
  "CONFLICT" | "INVALID_TRANSITION" | "STOCK_INTEGRITY" | "NOT_FOUND";

export class OrderTransitionError extends Error {
  constructor(
    message: string,
    readonly code: OrderTransitionErrorCode,
  ) {
    super(message);
  }
}

type ReservationRow = {
  id: string;
  stockItemId: string;
  quantity: number;
  status: string;
  stockItem: {
    quantity: number;
    reservedQuantity: number;
    warehouseCode: string;
  };
};

function hashTransition(
  actor: OrderTransitionActor,
  input: OrderTransitionInput,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        actorUserId: actor.userId,
        orderId: input.orderId,
        expectedStatus: input.expectedStatus,
        expectedVersion: input.expectedVersion,
        targetStatus: input.targetStatus,
        note: input.note?.trim() || null,
        carrier: input.carrier?.trim() || null,
        trackingNumber: input.trackingNumber?.trim() || null,
      }),
    )
    .digest("hex");
}

function assertCompleteActiveReservations(
  items: Array<{ quantity: number; reservations: ReservationRow[] }>,
) {
  if (items.length === 0) {
    throw new OrderTransitionError("Kalemsiz siparişte stok yaşam döngüsü işlemi yapılamaz.", "STOCK_INTEGRITY");
  }
  for (const item of items) {
    const activeQuantity = item.reservations
      .filter((reservation) => reservation.status === "ACTIVE")
      .reduce((total, reservation) => total + reservation.quantity, 0);
    if (activeQuantity !== item.quantity) {
      throw new OrderTransitionError(
        "Sipariş kalemlerinin aktif stok rezervasyonları eksik veya tutarsız.",
        "STOCK_INTEGRITY",
      );
    }
  }
}

function groupActiveReservations(
  items: Array<{ reservations: ReservationRow[] }>,
) {
  const groups = new Map<
    string,
    {
      stockItemId: string;
      warehouseCode: string;
      quantity: number;
      beforeQuantity: number;
      beforeReservedQuantity: number;
      reservationIds: string[];
    }
  >();

  for (const item of items) {
    for (const reservation of item.reservations.filter(
      (entry) => entry.status === "ACTIVE",
    )) {
      const current = groups.get(reservation.stockItemId);
      if (current) {
        current.quantity += reservation.quantity;
        current.reservationIds.push(reservation.id);
      } else {
        groups.set(reservation.stockItemId, {
          stockItemId: reservation.stockItemId,
          warehouseCode: reservation.stockItem.warehouseCode,
          quantity: reservation.quantity,
          beforeQuantity: reservation.stockItem.quantity,
          beforeReservedQuantity: reservation.stockItem.reservedQuantity,
          reservationIds: [reservation.id],
        });
      }
    }
  }

  return [...groups.values()].sort((left, right) =>
    left.stockItemId.localeCompare(right.stockItemId),
  );
}

async function mutateReservations(
  tx: Prisma.TransactionClient,
  items: Array<{ quantity: number; reservations: ReservationRow[] }>,
  mode: "RELEASE" | "CONSUME",
) {
  assertCompleteActiveReservations(items);
  const groups = groupActiveReservations(items);
  const stockChanges: Array<Record<string, string | number>> = [];

  for (const group of groups) {
    const stock = await tx.stockItem.updateMany({
      where: {
        id: group.stockItemId,
        reservedQuantity: { gte: group.quantity },
        ...(mode === "CONSUME" ? { quantity: { gte: group.quantity } } : {}),
      },
      data: {
        reservedQuantity: { decrement: group.quantity },
        ...(mode === "CONSUME"
          ? { quantity: { decrement: group.quantity } }
          : {}),
      },
    });
    if (stock.count !== 1) {
      throw new OrderTransitionError(
        "Stok sayacı rezervasyon defteriyle uyuşmuyor.",
        "STOCK_INTEGRITY",
      );
    }

    stockChanges.push({
      stockItemId: group.stockItemId,
      warehouseCode: group.warehouseCode,
      quantity: group.quantity,
      beforeQuantity: group.beforeQuantity,
      afterQuantity:
        group.beforeQuantity - (mode === "CONSUME" ? group.quantity : 0),
      beforeReservedQuantity: group.beforeReservedQuantity,
      afterReservedQuantity: group.beforeReservedQuantity - group.quantity,
    });
  }

  const reservationIds = groups.flatMap((group) => group.reservationIds);
  const now = new Date();
  const reservations = await tx.stockReservation.updateMany({
    where: { id: { in: reservationIds }, status: "ACTIVE" },
    data:
      mode === "RELEASE"
        ? {
            status: "RELEASED",
            releasedAt: now,
            releaseReason: "ORDER_CANCELLED",
          }
        : { status: "CONSUMED", consumedAt: now },
  });
  if (reservations.count !== reservationIds.length) {
    throw new OrderTransitionError(
      "Rezervasyonlardan biri başka bir işlem tarafından güncellendi.",
      "CONFLICT",
    );
  }

  return {
    quantity: groups.reduce((total, group) => total + group.quantity, 0),
    stockChanges,
  };
}

function replayResult(command: {
  orderId: string;
  toStatus: string;
  resultVersion: number;
}) {
  return {
    id: command.orderId,
    status: command.toStatus as OrderStatus,
    version: command.resultVersion,
    replayed: true,
  };
}

export async function transitionOrderStatus(
  actor: OrderTransitionActor,
  input: OrderTransitionInput,
) {
  const requestHash = hashTransition(actor, input);
  const existing = await prisma.orderTransitionCommand.findUnique({
    where: {
      orderId_idempotencyKey: {
        orderId: input.orderId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new OrderTransitionError(
        "Aynı işlem anahtarı farklı bir istekle kullanılamaz.",
        "CONFLICT",
      );
    }
    return replayResult(existing);
  }

  return prisma.$transaction(async (tx) => {
    await tx.checkoutLock.upsert({
      where: { id: "order-checkout" },
      create: { id: "order-checkout", version: 1 },
      update: { version: { increment: 1 } },
    });

    const replay = await tx.orderTransitionCommand.findUnique({
      where: {
        orderId_idempotencyKey: {
          orderId: input.orderId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (replay) {
      if (replay.requestHash !== requestHash) {
        throw new OrderTransitionError(
          "Aynı işlem anahtarı farklı bir istekle kullanılamaz.",
          "CONFLICT",
        );
      }
      return replayResult(replay);
    }

    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        status: true,
        version: true,
        heldFromStatus: true,
        shipmentMethod: true,
        shipment: { select: { status: true } },
        items: {
          select: {
            quantity: true,
            reservations: {
              select: {
                id: true,
                stockItemId: true,
                quantity: true,
                status: true,
                stockItem: {
                  select: {
                    quantity: true,
                    reservedQuantity: true,
                    warehouseCode: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!order)
      throw new OrderTransitionError("Sipariş bulunamadı.", "NOT_FOUND");
    if (
      order.status !== input.expectedStatus ||
      order.version !== input.expectedVersion
    ) {
      throw new OrderTransitionError(
        "Sipariş başka bir kullanıcı tarafından güncellendi. Güncel veriyi yükleyin.",
        "CONFLICT",
      );
    }
    if (
      !canTransitionOrder(
        order.status,
        input.targetStatus,
        order.heldFromStatus,
      )
    ) {
      throw new OrderTransitionError(
        `${getStatusLabel(order.status)} durumundan ${getStatusLabel(input.targetStatus)} durumuna doğrudan geçilemez.`,
        "INVALID_TRANSITION",
      );
    }

    const now = new Date();
    let reservationEffect: {
      quantity: number;
      stockChanges: Array<Record<string, string | number>>;
    } = {
      quantity: 0,
      stockChanges: [],
    };

    if (input.targetStatus === "CANCELLED") {
      reservationEffect = await mutateReservations(tx, order.items, "RELEASE");
      await tx.shipment.updateMany({
        where: {
          orderId: order.id,
          status: { notIn: ["SHIPPED", "DELIVERED"] },
        },
        data: { status: "CANCELLED" },
      });
    }

    if (input.targetStatus === "SHIPPED") {
      const isPickup = order.shipmentMethod === "CUSTOMER_PICKUP";
      if (!isPickup && (!input.carrier || !input.trackingNumber)) {
        throw new OrderTransitionError(
          "Kargolu sevkiyat için taşıyıcı ve takip numarası zorunludur.",
          "INVALID_TRANSITION",
        );
      }
      reservationEffect = await mutateReservations(tx, order.items, "CONSUME");
      await tx.shipment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          status: "SHIPPED",
          carrier: isPickup ? "CUSTOMER_PICKUP" : input.carrier,
          trackingNumber: isPickup ? undefined : input.trackingNumber,
          shippedAt: now,
        },
        update: {
          status: "SHIPPED",
          carrier: isPickup ? "CUSTOMER_PICKUP" : input.carrier,
          trackingNumber: isPickup ? null : input.trackingNumber,
          shippedAt: now,
        },
      });
    }

    if (input.targetStatus === "DELIVERED") {
      const allConsumed = order.items.every(
        (item) =>
          item.reservations.length > 0 &&
          item.reservations.every(
            (reservation) => reservation.status === "CONSUMED",
          ),
      );
      if (!allConsumed || order.shipment?.status !== "SHIPPED") {
        throw new OrderTransitionError(
          "Tüketilmiş rezervasyon ve sevk kaydı olmadan teslim verilemez.",
          "STOCK_INTEGRITY",
        );
      }
      const shipment = await tx.shipment.updateMany({
        where: { orderId: order.id, status: "SHIPPED" },
        data: { status: "DELIVERED", deliveredAt: now },
      });
      if (shipment.count !== 1)
        throw new OrderTransitionError(
          "Sevkiyat kaydı güncellendi; sayfayı yenileyin.",
          "CONFLICT",
        );
    }

    const resultVersion = order.version + 1;
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: order.status, version: order.version },
      data: {
        status: input.targetStatus,
        version: { increment: 1 },
        heldFromStatus:
          input.targetStatus === "ON_HOLD"
            ? order.status
            : order.status === "ON_HOLD"
              ? null
              : order.heldFromStatus,
        ...(input.targetStatus === "CONFIRMED"
          ? { approvedById: actor.userId }
          : {}),
      },
    });
    if (updated.count !== 1)
      throw new OrderTransitionError(
        "Sipariş başka bir işlem tarafından güncellendi.",
        "CONFLICT",
      );

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: input.targetStatus,
        changedById: actor.userId,
        note: input.note,
      },
    });
    await tx.orderTransitionCommand.create({
      data: {
        orderId: order.id,
        idempotencyKey: input.idempotencyKey,
        requestHash,
        fromStatus: order.status,
        toStatus: input.targetStatus,
        resultVersion,
        createdById: actor.userId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: "order.status.changed",
        entityType: "Order",
        entityId: order.id,
        metadata: JSON.stringify({
          fromStatus: order.status,
          toStatus: input.targetStatus,
          fromVersion: order.version,
          toVersion: resultVersion,
          idempotencyKey: input.idempotencyKey,
          note: input.note ?? null,
          reservationQuantity: reservationEffect.quantity,
          stockChanges: reservationEffect.stockChanges,
        }),
      },
    });
    await enqueueIntegrationEvent(tx, {
      topic: "commerce.order.status_changed.v1",
      eventType: "ORDER_STATUS_CHANGED",
      aggregateType: "Order",
      aggregateId: order.id,
      payload: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: input.targetStatus,
        resultVersion,
      },
      idempotencyKey: `order:${order.id}:status:${resultVersion}`,
    });
    if (
      input.targetStatus === "READY_FOR_SHIPMENT" &&
      order.shipmentMethod === "CITY_LOJISTIK"
    ) {
      await enqueueIntegrationEvent(tx, {
        topic: "shipping.shipment_create_requested.v1",
        eventType: "SHIPMENT_CREATE_REQUESTED",
        aggregateType: "Order",
        aggregateId: order.id,
        providerCode: "CITY_LOJISTIK",
        payload: { orderId: order.id, orderVersion: resultVersion },
        idempotencyKey: `shipment:${order.id}:create:v1`,
      });
    }

    return {
      id: order.id,
      status: input.targetStatus,
      version: resultVersion,
      replayed: false,
    };
  });
}
