import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { QuoteOperationError } from "@/data/quote-operations";
import { enqueueIntegrationEvent } from "@/integrations/outbox";
import { prisma } from "@/lib/prisma";

type QuoteConversionActor = { userId: string };

export type QuoteConversionInput = {
  quoteId: string;
  expectedVersion: number;
  expectedOfferRevisionId: string;
  deliveryAddressId: string;
  shipmentMethod: "CITY_LOJISTIK" | "CUSTOMER_PICKUP" | "SALES_COORDINATION";
  notes?: string;
  idempotencyKey: string;
};

function canonicalText(value?: string) {
  return value?.normalize("NFC").replace(/\r\n?/g, "\n").trim() || null;
}

function conversionHash(actor: QuoteConversionActor, input: QuoteConversionInput) {
  return createHash("sha256").update(JSON.stringify({
    schemaVersion: 1,
    operation: "QUOTE_TO_ORDER",
    actorUserId: actor.userId,
    quoteId: input.quoteId,
    expectedVersion: input.expectedVersion,
    expectedOfferRevisionId: input.expectedOfferRevisionId,
    deliveryAddressId: input.deliveryAddressId,
    shipmentMethod: input.shipmentMethod,
    notes: canonicalText(input.notes),
  })).digest("hex");
}

export async function convertApprovedQuoteToOrder(
  actor: QuoteConversionActor,
  input: QuoteConversionInput,
) {
  const requestHash = conversionHash(actor, input);
  const notes = canonicalText(input.notes);

  return prisma.$transaction(async (tx) => {
    await tx.checkoutLock.upsert({
      where: { id: "quote-operations" },
      create: { id: "quote-operations", version: 1 },
      update: { version: { increment: 1 } },
    });

    const priorCommand = await tx.quoteOperationCommand.findUnique({
      where: {
        quoteId_idempotencyKey: {
          quoteId: input.quoteId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: { requestHash: true, resultOrderId: true },
    });
    if (priorCommand) {
      if (priorCommand.requestHash !== requestHash || !priorCommand.resultOrderId) {
        throw new QuoteOperationError(
          "Aynı işlem anahtarı farklı bir istekle kullanılamaz.",
          "CONFLICT",
        );
      }
      return { id: priorCommand.resultOrderId, replayed: true };
    }

    const quote = await tx.quoteRequest.findUnique({
      where: { id: input.quoteId },
      select: {
        id: true,
        status: true,
        version: true,
        companyId: true,
        requesterUserId: true,
        desiredDeliveryDate: true,
        activeOfferRevisionId: true,
        _count: { select: { items: true } },
        activeOfferRevision: {
          select: {
            id: true,
            currency: true,
            subtotal: true,
            validUntil: true,
            items: {
              orderBy: { quoteRequestItemId: "asc" },
              select: {
                id: true,
                quoteRequestItemId: true,
                quantitySnapshot: true,
                unitPrice: true,
                lineTotal: true,
                productCodeSnapshot: true,
                productNameSnapshot: true,
                dimensionsSnapshot: true,
                glassTypeSnapshot: true,
                quoteRequestItem: {
                  select: {
                    dimensions: true,
                    glassType: true,
                    notes: true,
                    product: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        status: true,
                        stockItems: {
                          orderBy: { warehouseCode: "asc" },
                          select: {
                            id: true,
                            quantity: true,
                            reservedQuantity: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!quote) {
      throw new QuoteOperationError("Teklif bulunamadı.", "NOT_FOUND");
    }
    if (
      quote.status !== "APPROVED" ||
      quote.version !== input.expectedVersion ||
      quote.activeOfferRevisionId !== input.expectedOfferRevisionId
    ) {
      throw new QuoteOperationError(
        "Teklif başka bir kullanıcı tarafından güncellendi. Güncel veriyi yükleyin.",
        "CONFLICT",
      );
    }
    if (!quote.companyId || !quote.activeOfferRevision) {
      throw new QuoteOperationError(
        "Teklifin firması veya aktif fiyat revizyonu eksik.",
        "INVALID_CONVERSION",
      );
    }
    if (
      quote.activeOfferRevision.items.length !== quote._count.items ||
      quote.activeOfferRevision.items.length === 0
    ) {
      throw new QuoteOperationError(
        "Aktif teklif revizyonu tüm kalemleri içermiyor.",
        "INVALID_CONVERSION",
      );
    }
    if (
      quote.activeOfferRevision.validUntil &&
      quote.activeOfferRevision.validUntil.getTime() < Date.now()
    ) {
      throw new QuoteOperationError(
        "Aktif teklif revizyonunun geçerlilik süresi dolmuş.",
        "INVALID_CONVERSION",
      );
    }

    const address = await tx.address.findFirst({
      where: { id: input.deliveryAddressId, companyId: quote.companyId },
    });
    if (!address) {
      throw new QuoteOperationError(
        "Teslimat adresi teklif firmasına ait değil.",
        "INVALID_CONVERSION",
      );
    }

    const snapshots = quote.activeOfferRevision.items.map((item) => {
      const product = item.quoteRequestItem.product;
      if (!product) {
        throw new QuoteOperationError(
          "Özel ürün bağlantısı olmayan teklif kalemleri henüz siparişe dönüştürülemez.",
          "INVALID_CONVERSION",
        );
      }
      if (product.status !== "ACTIVE") {
        throw new QuoteOperationError(
          `${product.name} artık aktif değil. Dönüşümden önce ürün durumunu kontrol edin.`,
          "INVALID_CONVERSION",
        );
      }
      const available = product.stockItems.reduce(
        (sum, stock) => sum + Math.max(0, stock.quantity - stock.reservedQuantity),
        0,
      );
      if (available < item.quantitySnapshot) {
        throw new QuoteOperationError(
          `${product.name} için yeterli kullanılabilir stok yok.`,
          "INVALID_CONVERSION",
        );
      }
      return {
        revisionItemId: item.id,
        product,
        quantity: item.quantitySnapshot,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        productCode: item.productCodeSnapshot ?? product.code,
        productName: item.productNameSnapshot ?? product.name,
        dimensions: item.dimensionsSnapshot ?? item.quoteRequestItem.dimensions,
        glassType: item.glassTypeSnapshot ?? item.quoteRequestItem.glassType,
        notes: item.quoteRequestItem.notes,
      };
    });

    const now = new Date();
    const order = await tx.order.create({
      data: {
        orderNumber: `SPR-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
        companyId: quote.companyId,
        createdById: quote.requesterUserId,
        approvedById: actor.userId,
        status: "SUBMITTED",
        currency: quote.activeOfferRevision.currency,
        subtotal: quote.activeOfferRevision.subtotal,
        deliveryAddressId: address.id,
        deliveryLabel: address.label,
        deliveryLine1: address.line1,
        deliveryLine2: address.line2,
        deliveryDistrict: address.district,
        deliveryCity: address.city,
        deliveryCountry: address.country,
        deliveryPostalCode: address.postalCode,
        requestedDeliveryDate: quote.desiredDeliveryDate,
        shipmentMethod: input.shipmentMethod,
        notes,
        submittedAt: now,
        pricedAt: now,
        idempotencyKey: `quote-conversion:${input.idempotencyKey}`,
        requestHash,
        sourceQuoteId: quote.id,
        sourceQuoteVersion: quote.version,
        sourceOfferRevisionId: quote.activeOfferRevision.id,
      },
      select: { id: true, orderNumber: true },
    });

    for (const snapshot of snapshots) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: snapshot.product.id,
          quantity: snapshot.quantity,
          unitPrice: snapshot.unitPrice,
          lineTotal: snapshot.lineTotal,
          productCodeSnapshot: snapshot.productCode,
          productNameSnapshot: snapshot.productName,
          dimensionsSnapshot: snapshot.dimensions,
          glassTypeSnapshot: snapshot.glassType ?? "",
          priceScope: "QUOTE_REVISION",
          notes: snapshot.notes,
          sourceOfferRevisionItemId: snapshot.revisionItemId,
        },
        select: { id: true },
      });

      let remaining = snapshot.quantity;
      for (const stock of snapshot.product.stockItems) {
        if (remaining === 0) break;
        const allocation = Math.min(
          remaining,
          Math.max(0, stock.quantity - stock.reservedQuantity),
        );
        if (!allocation) continue;
        const reserved = await tx.stockItem.updateMany({
          where: {
            id: stock.id,
            reservedQuantity: stock.reservedQuantity,
            quantity: { gte: stock.reservedQuantity + allocation },
          },
          data: { reservedQuantity: { increment: allocation } },
        });
        if (reserved.count !== 1) {
          throw new QuoteOperationError(
            `${snapshot.product.name} stok kaydı eşzamanlı olarak değişti. Tekrar deneyin.`,
            "CONFLICT",
          );
        }
        await tx.stockReservation.create({
          data: {
            orderItemId: orderItem.id,
            stockItemId: stock.id,
            quantity: allocation,
          },
        });
        remaining -= allocation;
      }
      if (remaining !== 0) {
        throw new QuoteOperationError(
          `${snapshot.product.name} için stok rezervasyonu tamamlanamadı.`,
          "CONFLICT",
        );
      }
    }

    const resultVersion = quote.version + 1;
    const converted = await tx.quoteRequest.updateMany({
      where: {
        id: quote.id,
        status: "APPROVED",
        version: quote.version,
        activeOfferRevisionId: quote.activeOfferRevision.id,
      },
      data: { status: "CONVERTED_TO_ORDER", version: { increment: 1 } },
    });
    if (converted.count !== 1) {
      throw new QuoteOperationError(
        "Teklif başka bir işlem tarafından güncellendi.",
        "CONFLICT",
      );
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        toStatus: "SUBMITTED",
        changedById: actor.userId,
        note: "Onaylanan tekliften sipariş oluşturuldu.",
      },
    });
    await tx.quoteStatusHistory.create({
      data: {
        quoteId: quote.id,
        fromStatus: "APPROVED",
        toStatus: "CONVERTED_TO_ORDER",
        changedById: actor.userId,
        note: `${order.orderNumber} numaralı sipariş oluşturuldu.`,
      },
    });
    await tx.quoteOperationCommand.create({
      data: {
        quoteId: quote.id,
        idempotencyKey: input.idempotencyKey,
        operation: "CONVERT_TO_ORDER",
        requestHash,
        fromStatus: "APPROVED",
        toStatus: "CONVERTED_TO_ORDER",
        resultVersion,
        resultOrderId: order.id,
        createdById: actor.userId,
      },
    });
    await tx.auditLog.createMany({
      data: [
        {
          actorUserId: actor.userId,
          action: "quote.converted_to_order",
          entityType: "QuoteRequest",
          entityId: quote.id,
          metadata: JSON.stringify({ orderId: order.id, offerRevisionId: quote.activeOfferRevision.id, fromVersion: quote.version, toVersion: resultVersion }),
        },
        {
          actorUserId: actor.userId,
          action: "order.created_from_quote",
          entityType: "Order",
          entityId: order.id,
          metadata: JSON.stringify({ quoteId: quote.id, offerRevisionId: quote.activeOfferRevision.id, itemCount: snapshots.length }),
        },
      ],
    });
    await enqueueIntegrationEvent(tx, {
      topic: "commerce.quote.converted_to_order.v1",
      eventType: "QUOTE_CONVERTED_TO_ORDER",
      aggregateType: "QuoteRequest",
      aggregateId: quote.id,
      payload: {
        quoteId: quote.id,
        orderId: order.id,
        offerRevisionId: quote.activeOfferRevision.id,
        resultVersion,
      },
      idempotencyKey: `quote:${quote.id}:converted:${resultVersion}`,
    });
    await enqueueIntegrationEvent(tx, {
      topic: "commerce.order.submitted.v1",
      eventType: "ORDER_SUBMITTED",
      aggregateType: "Order",
      aggregateId: order.id,
      payload: {
        orderId: order.id,
        companyId: quote.companyId,
        source: "QUOTE_CONVERSION",
        sourceQuoteId: quote.id,
      },
      idempotencyKey: `order:${order.id}:submitted:v1`,
    });

    return { id: order.id, replayed: false };
  });
}
