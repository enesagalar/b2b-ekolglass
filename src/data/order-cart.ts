import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { buildCatalogPriceWhere } from "@/data/catalog-access";
import {
  selectCatalogPriceForQuantity,
  type CatalogViewer,
} from "@/domain/catalog";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type OrderActor = {
  userId: string;
  companyId: string;
  customerGroupId?: string | null;
  role: "DEALER_OWNER" | "DEALER_STAFF";
};

async function assertActiveDealer(
  tx: Prisma.TransactionClient,
  actor: OrderActor,
) {
  const user = await tx.user.findFirst({
    where: {
      id: actor.userId,
      companyId: actor.companyId,
      status: "ACTIVE",
      company: { status: "APPROVED" },
    },
    select: {
      id: true,
      role: true,
      company: { select: { customerGroupId: true } },
    },
  });
  if (!user) throw new Error("Bayi oturumu veya firma durumu geçersiz.");
  return user;
}

function viewerFor(actor: OrderActor): CatalogViewer {
  return {
    role: actor.role,
    companyId: actor.companyId,
    customerGroupId: actor.customerGroupId,
  };
}

export function getOrderCart(actor: OrderActor) {
  return prisma.orderCart.findUnique({
    where: {
      companyId_ownerUserId: {
        companyId: actor.companyId,
        ownerUserId: actor.userId,
      },
    },
    select: {
      id: true,
      version: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          quantity: true,
          notes: true,
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              dimensions: true,
              glassType: true,
              orderMode: true,
              status: true,
              category: { select: { name: true } },
              stockItems: {
                select: {
                  id: true,
                  quantity: true,
                  reservedQuantity: true,
                  status: true,
                },
              },
              prices: {
                where: buildCatalogPriceWhere(viewerFor(actor)),
                select: {
                  id: true,
                  amount: true,
                  minQuantity: true,
                  priceList: {
                    select: {
                      id: true,
                      currency: true,
                      companyId: true,
                      customerGroupId: true,
                      startsAt: true,
                      endsAt: true,
                      isActive: true,
                      priority: true,
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
}

export async function addOrderCartProduct(
  actor: OrderActor,
  input: { productId: string; quantity: number; notes?: string },
) {
  return prisma.$transaction(async (tx) => {
    await assertActiveDealer(tx, actor);
    const product = await tx.product.findFirst({
      where: {
        id: input.productId,
        status: "ACTIVE",
        orderMode: { in: ["ORDER_ONLY", "QUOTE_OR_ORDER"] },
      },
      select: { id: true },
    });
    if (!product) throw new Error("Bu ürün doğrudan siparişe eklenemiyor.");

    const cart = await tx.orderCart.upsert({
      where: {
        companyId_ownerUserId: {
          companyId: actor.companyId,
          ownerUserId: actor.userId,
        },
      },
      update: {},
      create: { companyId: actor.companyId, ownerUserId: actor.userId },
      select: { id: true },
    });
    const existing = await tx.orderCartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      select: { id: true, quantity: true },
    });
    if (existing) {
      const item = await tx.orderCartItem.update({
        where: { id: existing.id },
        data: {
          quantity: Math.min(999, existing.quantity + input.quantity),
          notes: input.notes ?? undefined,
        },
      });
      await tx.orderCart.update({
        where: { id: cart.id },
        data: { version: { increment: 1 } },
      });
      return item;
    }
    const item = await tx.orderCartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity: input.quantity,
        notes: input.notes,
      },
    });
    await tx.orderCart.update({
      where: { id: cart.id },
      data: { version: { increment: 1 } },
    });
    return item;
  });
}

export async function updateOrderCartProduct(
  actor: OrderActor,
  input: { itemId: string; quantity: number; notes?: string },
) {
  return prisma.$transaction(async (tx) => {
    await assertActiveDealer(tx, actor);
    const item = await tx.orderCartItem.findFirst({
      where: {
        id: input.itemId,
        cart: { companyId: actor.companyId, ownerUserId: actor.userId },
      },
      select: { id: true, cartId: true },
    });
    if (!item) throw new Error("Sepet kalemi bulunamadı.");
    const updated = await tx.orderCartItem.update({
      where: { id: item.id },
      data: { quantity: input.quantity, notes: input.notes },
    });
    await tx.orderCart.update({
      where: { id: item.cartId },
      data: { version: { increment: 1 } },
    });
    return updated;
  });
}

export async function removeOrderCartProduct(
  actor: OrderActor,
  itemId: string,
) {
  return prisma.$transaction(async (tx) => {
    await assertActiveDealer(tx, actor);
    const item = await tx.orderCartItem.findFirst({
      where: {
        id: itemId,
        cart: { companyId: actor.companyId, ownerUserId: actor.userId },
      },
      select: { id: true, cartId: true },
    });
    if (!item) throw new Error("Sepet kalemi bulunamadı.");
    const deleted = await tx.orderCartItem.delete({ where: { id: item.id } });
    await tx.orderCart.update({
      where: { id: item.cartId },
      data: { version: { increment: 1 } },
    });
    return deleted;
  });
}

export async function submitOrderCart(
  actor: OrderActor,
  input: {
    cartId: string;
    cartVersion: number;
    deliveryAddressId: string;
    shipmentMethod: string;
    notes?: string;
    idempotencyKey: string;
  },
) {
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        companyId: actor.companyId,
        userId: actor.userId,
        cartId: input.cartId,
        cartVersion: input.cartVersion,
        deliveryAddressId: input.deliveryAddressId,
        shipmentMethod: input.shipmentMethod,
        notes: input.notes?.trim() || null,
      }),
    )
    .digest("hex");
  return prisma.$transaction(async (tx) => {
    await tx.checkoutLock.upsert({
      where: { id: "order-checkout" },
      update: { version: { increment: 1 } },
      create: { id: "order-checkout", version: 1 },
    });

    const existing = await tx.order.findUnique({
      where: {
        companyId_idempotencyKey: {
          companyId: actor.companyId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: {
        id: true,
        companyId: true,
        createdById: true,
        requestHash: true,
      },
    });
    if (existing) {
      if (
        existing.createdById !== actor.userId ||
        existing.requestHash !== requestHash
      ) {
        throw new Error(
          "Gönderim anahtarı farklı bir sipariş isteğiyle kullanılmış.",
        );
      }
      return existing;
    }

    const activeUser = await assertActiveDealer(tx, actor);
    const viewer: CatalogViewer = {
      role: activeUser.role as "DEALER_OWNER" | "DEALER_STAFF",
      companyId: actor.companyId,
      customerGroupId: activeUser.company?.customerGroupId,
    };
    const address = await tx.address.findFirst({
      where: { id: input.deliveryAddressId, companyId: actor.companyId },
    });
    if (!address) throw new Error("Teslimat adresi firmanıza ait değil.");

    const pricedAt = new Date();
    const cart = await tx.orderCart.findFirst({
      where: {
        id: input.cartId,
        companyId: actor.companyId,
        ownerUserId: actor.userId,
        version: input.cartVersion,
      },
      select: {
        id: true,
        version: true,
        items: {
          select: {
            quantity: true,
            notes: true,
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                dimensions: true,
                glassType: true,
                status: true,
                orderMode: true,
                stockItems: {
                  orderBy: { warehouseCode: "asc" },
                  select: {
                    id: true,
                    quantity: true,
                    reservedQuantity: true,
                    status: true,
                  },
                },
                prices: {
                  where: buildCatalogPriceWhere(viewer, pricedAt),
                  select: {
                    id: true,
                    amount: true,
                    minQuantity: true,
                    priceList: {
                      select: {
                        id: true,
                        currency: true,
                        companyId: true,
                        customerGroupId: true,
                        startsAt: true,
                        endsAt: true,
                        isActive: true,
                        priority: true,
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
    if (!cart?.items.length) throw new Error("Sipariş sepetiniz boş.");

    const snapshots = cart.items.map((item) => {
      if (
        item.product.status !== "ACTIVE" ||
        item.product.orderMode === "QUOTE_ONLY"
      ) {
        throw new Error(
          `${item.product.name} artık doğrudan siparişe uygun değil.`,
        );
      }
      const price = selectCatalogPriceForQuantity(
        item.product.prices,
        viewer,
        item.quantity,
        pricedAt,
      );
      if (!price)
        throw new Error(
          `${item.product.name} için geçerli firma fiyatı bulunamadı.`,
        );
      const stockItems = item.product.stockItems;
      const available = stockItems.reduce(
        (sum, stock) =>
          sum + Math.max(0, stock.quantity - stock.reservedQuantity),
        0,
      );
      if (available < item.quantity)
        throw new Error(
          `${item.product.name} için yeterli kullanılabilir stok yok.`,
        );
      const unitPrice = new Prisma.Decimal(price.amount.toString());
      return {
        productId: item.product.id,
        productCodeSnapshot: item.product.code,
        productNameSnapshot: item.product.name,
        dimensionsSnapshot: item.product.dimensions,
        glassTypeSnapshot: item.product.glassType,
        quantity: item.quantity,
        notes: item.notes,
        unitPrice,
        lineTotal: unitPrice.mul(item.quantity),
        priceListId: price.priceList.id,
        sourceProductPriceId: price.id,
        priceMinQuantity: price.minQuantity,
        priceScope: price.priceList.companyId
          ? "COMPANY"
          : price.priceList.customerGroupId
            ? "CUSTOMER_GROUP"
            : "PUBLIC",
        currency: price.priceList.currency,
        stockItems,
      };
    });
    const currencies = [...new Set(snapshots.map((item) => item.currency))];
    if (currencies.length !== 1)
      throw new Error("Sepette birden fazla para birimi bulunuyor.");
    const subtotal = snapshots.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );

    const order = await tx.order.create({
      data: {
        orderNumber: `SPR-${pricedAt.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
        companyId: actor.companyId,
        createdById: actor.userId,
        status: "SUBMITTED",
        currency: currencies[0],
        subtotal,
        deliveryAddressId: address.id,
        deliveryLabel: address.label,
        deliveryLine1: address.line1,
        deliveryLine2: address.line2,
        deliveryDistrict: address.district,
        deliveryCity: address.city,
        deliveryCountry: address.country,
        deliveryPostalCode: address.postalCode,
        shipmentMethod: input.shipmentMethod,
        notes: input.notes,
        submittedAt: pricedAt,
        pricedAt,
        idempotencyKey: input.idempotencyKey,
        requestHash,
        sourceCartId: cart.id,
        sourceCartVersion: cart.version,
      },
      select: { id: true, companyId: true, createdById: true },
    });

    for (const snapshot of snapshots) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: snapshot.productId,
          quantity: snapshot.quantity,
          unitPrice: snapshot.unitPrice,
          lineTotal: snapshot.lineTotal,
          productCodeSnapshot: snapshot.productCodeSnapshot,
          productNameSnapshot: snapshot.productNameSnapshot,
          dimensionsSnapshot: snapshot.dimensionsSnapshot,
          glassTypeSnapshot: snapshot.glassTypeSnapshot,
          sourceProductPriceId: snapshot.sourceProductPriceId,
          priceListId: snapshot.priceListId,
          priceMinQuantity: snapshot.priceMinQuantity,
          priceScope: snapshot.priceScope,
          notes: snapshot.notes,
        },
        select: { id: true },
      });
      let remaining = snapshot.quantity;
      for (const stock of snapshot.stockItems) {
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
        if (reserved.count !== 1)
          throw new Error(
            `${snapshot.productNameSnapshot} stok kaydı eşzamanlı olarak değişti. Lütfen tekrar deneyin.`,
          );
        await tx.stockReservation.create({
          data: {
            orderItemId: orderItem.id,
            stockItemId: stock.id,
            quantity: allocation,
          },
        });
        remaining -= allocation;
      }
      if (remaining !== 0)
        throw new Error(
          `${snapshot.productNameSnapshot} için stok rezervasyonu tamamlanamadı.`,
        );
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        toStatus: "SUBMITTED",
        changedById: actor.userId,
        note: "Bayi sipariş sepetinden gönderildi.",
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: "dealer.order.submitted",
        entityType: "Order",
        entityId: order.id,
        metadata: JSON.stringify({
          companyId: actor.companyId,
          itemCount: snapshots.length,
          subtotal: subtotal.toString(),
          currency: currencies[0],
        }),
      },
    });
    const removedCart = await tx.orderCart.deleteMany({
      where: { id: cart.id, version: input.cartVersion },
    });
    if (removedCart.count !== 1)
      throw new Error(
        "Sipariş sepeti gönderim sırasında değişti. Lütfen tekrar deneyin.",
      );
    return order;
  });
}
