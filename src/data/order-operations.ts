import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { deriveStockStatus } from "@/domain/catalog";
import {
  orderExposureStatuses,
  requiresCommercialReview,
} from "@/domain/order-credit";
import {
  canTransitionOrder,
  type OrderStatus,
} from "@/domain/order-transitions";
import { getStatusLabel } from "@/domain/statuses";
import { recordStockMovement } from "@/domain/stock-movement";
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
  commercialOverrideReason?: string;
};

export type OrderTransitionActor = {
  userId: string;
  canOverrideCredit?: boolean;
};
export type OrderTransitionErrorCode =
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "STOCK_INTEGRITY"
  | "COMMERCIAL_REVIEW_REQUIRED"
  | "NOT_FOUND";

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
    productId: string;
    product: { code: string };
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
        commercialOverrideReason: input.commercialOverrideReason?.trim() || null,
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
      productId: string;
      productCode: string;
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
          productId: reservation.stockItem.productId,
          productCode: reservation.stockItem.product.code,
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
  context: { orderId: string; actorUserId: string; idempotencyKey: string },
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
        status: deriveStockStatus(
          group.beforeQuantity - (mode === "CONSUME" ? group.quantity : 0),
          group.beforeReservedQuantity - group.quantity,
        ),
      },
    });
    if (stock.count !== 1) {
      throw new OrderTransitionError(
        "Stok sayacı rezervasyon defteriyle uyuşmuyor.",
        "STOCK_INTEGRITY",
      );
    }

    const afterQuantity = group.beforeQuantity - (mode === "CONSUME" ? group.quantity : 0);
    const afterReservedQuantity = group.beforeReservedQuantity - group.quantity;
    await recordStockMovement(tx, {
      stockItemId: group.stockItemId,
      productId: group.productId,
      productCode: group.productCode,
      warehouseCode: group.warehouseCode,
      movementType: mode === "RELEASE" ? "ORDER_RELEASE" : "ORDER_CONSUME",
      before: {
        quantity: group.beforeQuantity,
        reservedQuantity: group.beforeReservedQuantity,
      },
      after: {
        quantity: afterQuantity,
        reservedQuantity: afterReservedQuantity,
      },
      actorUserId: context.actorUserId,
      reason: mode === "RELEASE" ? "Sipariş iptalinde rezervasyon serbest bırakıldı." : "Sipariş sevkinde fiziksel ve rezerve stok tüketildi.",
      sourceType: "ORDER_TRANSITION",
      sourceId: context.orderId,
      idempotencyKey: `order-transition:${context.orderId}:${context.idempotencyKey}:${mode}:${group.stockItemId}`,
      metadata: { reservationIds: group.reservationIds, quantity: group.quantity },
    });

    stockChanges.push({
      stockItemId: group.stockItemId,
      warehouseCode: group.warehouseCode,
      quantity: group.quantity,
      beforeQuantity: group.beforeQuantity,
      afterQuantity:
        afterQuantity,
      beforeReservedQuantity: group.beforeReservedQuantity,
      afterReservedQuantity,
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
        companyId: true,
        subtotal: true,
        currency: true,
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
                    productId: true,
                    product: { select: { code: true } },
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
    let commercialDecision:
      | {
          paymentTermsSnapshot: string | null;
          creditPolicySnapshot: string;
          creditLimitSnapshot: Prisma.Decimal | null;
          creditExposureBefore: Prisma.Decimal;
          creditExposureAfter: Prisma.Decimal;
          commercialReviewRequired: boolean;
          overrideReason: string | null;
        }
      | undefined;
    if (input.targetStatus === "CONFIRMED") {
      const company = await tx.company.findUnique({
        where: { id: order.companyId },
        select: {
          paymentTerms: true,
          creditPolicy: true,
          creditLimit: true,
        },
      });
      if (!company) {
        throw new OrderTransitionError("Sipariş firması bulunamadı.", "NOT_FOUND");
      }
      const aggregate = await tx.order.aggregate({
        where: {
          companyId: order.companyId,
          id: { not: order.id },
          status: { in: [...orderExposureStatuses] },
          currency: order.currency,
        },
        _sum: { subtotal: true },
      });
      const before = new Prisma.Decimal(
        aggregate._sum.subtotal?.toString() ?? "0",
      );
      const after = before.add(order.subtotal);
      const reviewRequired = requiresCommercialReview({
        policy: company.creditPolicy,
        limit: company.creditLimit,
        exposureAfter: after,
        currency: order.currency,
      });
      const overrideReason = reviewRequired
        ? input.commercialOverrideReason?.trim() || null
        : null;
      if (reviewRequired && (!actor.canOverrideCredit || !overrideReason)) {
        throw new OrderTransitionError(
          "Kredi limiti veya ticari koşullar nedeniyle istisna onayı ve gerekçesi zorunludur.",
          "COMMERCIAL_REVIEW_REQUIRED",
        );
      }
      commercialDecision = {
        paymentTermsSnapshot: company.paymentTerms,
        creditPolicySnapshot: company.creditPolicy,
        creditLimitSnapshot: company.creditLimit,
        creditExposureBefore: before,
        creditExposureAfter: after,
        commercialReviewRequired: reviewRequired,
        overrideReason,
      };
    }
    let reservationEffect: {
      quantity: number;
      stockChanges: Array<Record<string, string | number>>;
    } = {
      quantity: 0,
      stockChanges: [],
    };

    if (input.targetStatus === "CANCELLED") {
      reservationEffect = await mutateReservations(tx, order.items, "RELEASE", {
        orderId: order.id,
        actorUserId: actor.userId,
        idempotencyKey: input.idempotencyKey,
      });
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
      reservationEffect = await mutateReservations(tx, order.items, "CONSUME", {
        orderId: order.id,
        actorUserId: actor.userId,
        idempotencyKey: input.idempotencyKey,
      });
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
          ? {
              approvedById: actor.userId,
              paymentTermsSnapshot: commercialDecision!.paymentTermsSnapshot,
              creditPolicySnapshot: commercialDecision!.creditPolicySnapshot,
              creditLimitSnapshot: commercialDecision!.creditLimitSnapshot,
              creditExposureBefore: commercialDecision!.creditExposureBefore,
              creditExposureAfter: commercialDecision!.creditExposureAfter,
              commercialReviewRequired:
                commercialDecision!.commercialReviewRequired,
              commercialOverrideReason: commercialDecision!.overrideReason,
              commercialOverrideById: commercialDecision!.overrideReason
                ? actor.userId
                : null,
              commercialOverrideAt: commercialDecision!.overrideReason
                ? now
                : null,
            }
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
          ...(commercialDecision
            ? {
                commercialReviewRequired:
                  commercialDecision.commercialReviewRequired,
                creditPolicy: commercialDecision.creditPolicySnapshot,
                creditLimit:
                  commercialDecision.creditLimitSnapshot?.toString() ?? null,
                exposureBefore:
                  commercialDecision.creditExposureBefore.toString(),
                exposureAfter:
                  commercialDecision.creditExposureAfter.toString(),
                commercialOverride: Boolean(
                  commercialDecision.overrideReason,
                ),
              }
            : {}),
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
      const provider = await tx.shippingProvider.findUnique({
        where: { code: "CITY_LOJISTIK" },
        select: { id: true },
      });
      await tx.shipment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          providerId: provider?.id,
          carrier: "CITY_LOJISTIK",
          status: "AWAITING_MANUAL_DISPATCH",
          rawStatus: "API_CONTRACT_PENDING",
        },
        update: {
          providerId: provider?.id,
          carrier: "CITY_LOJISTIK",
          status: "AWAITING_MANUAL_DISPATCH",
          rawStatus: "API_CONTRACT_PENDING",
        },
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
