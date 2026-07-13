import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { buildCatalogPriceWhere } from "@/data/catalog-access";
import { selectCatalogPriceForQuantity, type CatalogViewer } from "@/domain/catalog";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type DealerActor = {
  userId: string;
  companyId: string;
  customerGroupId?: string | null;
  role: "DEALER_OWNER" | "DEALER_STAFF";
};

async function assertActiveDealer(tx: Prisma.TransactionClient, actor: DealerActor) {
  const user = await tx.user.findFirst({
    where: { id: actor.userId, companyId: actor.companyId, status: "ACTIVE", company: { status: "APPROVED" } },
    select: { id: true },
  });
  if (!user) throw new Error("Bayi oturumu veya firma durumu geçersiz.");
}

function viewerFor(actor: DealerActor): CatalogViewer {
  return { role: actor.role, companyId: actor.companyId, customerGroupId: actor.customerGroupId };
}

function canonicalText(value?: string) {
  return value?.normalize("NFC").replace(/\r\n?/g, "\n").trim() || null;
}

export function getQuoteCart(actor: DealerActor) {
  return prisma.quoteCart.findUnique({
    where: { companyId_ownerUserId: { companyId: actor.companyId, ownerUserId: actor.userId } },
    select: {
      id: true,
      version: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, quantity: true, notes: true,
          product: {
            select: {
              id: true, code: true, name: true, dimensions: true, glassType: true, orderMode: true, isCustomAvailable: true, status: true,
              category: { select: { name: true } },
              prices: {
                where: buildCatalogPriceWhere(viewerFor(actor)),
                select: { id: true, amount: true, minQuantity: true, priceList: { select: { id: true, currency: true, companyId: true, customerGroupId: true, startsAt: true, endsAt: true, isActive: true, priority: true } } },
              },
            },
          },
        },
      },
    },
  });
}

export async function addQuoteCartProduct(actor: DealerActor, input: { productId: string; quantity: number; notes?: string }) {
  return prisma.$transaction(async (tx) => {
    await assertActiveDealer(tx, actor);
    const product = await tx.product.findFirst({ where: { id: input.productId, status: "ACTIVE", orderMode: { in: ["QUOTE_ONLY", "QUOTE_OR_ORDER"] } }, select: { id: true } });
    if (!product) throw new Error("Bu ürün teklif talebine eklenemiyor.");

    const cart = await tx.quoteCart.upsert({
      where: { companyId_ownerUserId: { companyId: actor.companyId, ownerUserId: actor.userId } },
      update: {},
      create: { companyId: actor.companyId, ownerUserId: actor.userId },
      select: { id: true },
    });
    const existing = await tx.quoteCartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId: product.id } }, select: { id: true, quantity: true } });
    const item = existing
      ? await tx.quoteCartItem.update({ where: { id: existing.id }, data: { quantity: Math.min(999, existing.quantity + input.quantity), notes: input.notes ?? undefined } })
      : await tx.quoteCartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: input.quantity, notes: input.notes } });
    await tx.quoteCart.update({ where: { id: cart.id }, data: { version: { increment: 1 } } });
    return item;
  });
}

export async function updateQuoteCartProduct(actor: DealerActor, input: { itemId: string; quantity: number; notes?: string }) {
  return prisma.$transaction(async (tx) => {
    await assertActiveDealer(tx, actor);
    const item = await tx.quoteCartItem.findFirst({ where: { id: input.itemId, cart: { companyId: actor.companyId, ownerUserId: actor.userId } }, select: { id: true, cartId: true } });
    if (!item) throw new Error("Sepet kalemi bulunamadı.");
    const updated = await tx.quoteCartItem.update({ where: { id: item.id }, data: { quantity: input.quantity, notes: input.notes } });
    await tx.quoteCart.update({ where: { id: item.cartId }, data: { version: { increment: 1 } } });
    return updated;
  });
}

export async function removeQuoteCartProduct(actor: DealerActor, itemId: string) {
  return prisma.$transaction(async (tx) => {
    await assertActiveDealer(tx, actor);
    const item = await tx.quoteCartItem.findFirst({ where: { id: itemId, cart: { companyId: actor.companyId, ownerUserId: actor.userId } }, select: { id: true, cartId: true } });
    if (!item) throw new Error("Sepet kalemi bulunamadı.");
    const removed = await tx.quoteCartItem.delete({ where: { id: item.id } });
    await tx.quoteCart.update({ where: { id: item.cartId }, data: { version: { increment: 1 } } });
    return removed;
  });
}

export async function submitQuoteCart(actor: DealerActor, input: { cartId: string; cartVersion: number; requesterName: string; requesterEmail: string; requesterPhone?: string; desiredDeliveryDate?: string; notes?: string; idempotencyKey: string }) {
  const requesterName = canonicalText(input.requesterName)!;
  const requesterEmail = canonicalText(input.requesterEmail)!.toLowerCase();
  const requesterPhone = canonicalText(input.requesterPhone);
  const desiredDeliveryDate = canonicalText(input.desiredDeliveryDate);
  const notes = canonicalText(input.notes);
  const requestHash = createHash("sha256").update(JSON.stringify({
    schemaVersion: 1,
    operation: "QUOTE_CART_SUBMIT",
    companyId: actor.companyId,
    requesterUserId: actor.userId,
    cartId: input.cartId,
    cartVersion: input.cartVersion,
    requesterName,
    requesterEmail,
    requesterPhone,
    desiredDeliveryDate,
    notes,
  })).digest("hex");
  return prisma.$transaction(async (tx) => {
    await tx.checkoutLock.upsert({
      where: { id: "quote-checkout" },
      update: { version: { increment: 1 } },
      create: { id: "quote-checkout", version: 1 },
    });
    const existing = await tx.quoteRequest.findUnique({
      where: { companyId_idempotencyKey: { companyId: actor.companyId, idempotencyKey: input.idempotencyKey } },
      select: { id: true, requesterUserId: true, requestHash: true },
    });
    if (existing) {
      if (existing.requesterUserId !== actor.userId || existing.requestHash !== requestHash) {
        throw new Error("Gönderim anahtarı farklı bir teklif isteğiyle kullanılmış.");
      }
      return existing;
    }

    await assertActiveDealer(tx, actor);
    const pricedAt = new Date();
    const viewer = viewerFor(actor);
    const cart = await tx.quoteCart.findFirst({
      where: { id: input.cartId, companyId: actor.companyId, ownerUserId: actor.userId, version: input.cartVersion },
      select: {
        id: true,
        version: true,
        items: { select: { quantity: true, notes: true, product: { select: {
          id: true, name: true, dimensions: true, glassType: true, status: true, orderMode: true, isCustomAvailable: true,
          prices: { where: buildCatalogPriceWhere(viewer, pricedAt), select: { id: true, amount: true, minQuantity: true, priceList: { select: { id: true, currency: true, companyId: true, customerGroupId: true, startsAt: true, endsAt: true, isActive: true, priority: true } } } },
        } } } },
      },
    });
    if (!cart?.items.length) throw new Error("Teklif sepetiniz değişti. Güncel sayfayı yükleyin.");

    const snapshots = cart.items.map((item) => {
      if (item.product.status !== "ACTIVE" || item.product.orderMode === "ORDER_ONLY") throw new Error(`${item.product.name} artık teklif talebine uygun değil.`);
      const price = selectCatalogPriceForQuantity(item.product.prices, viewer, item.quantity, pricedAt);
      if (!price && !item.product.isCustomAvailable) throw new Error(`${item.product.name} için geçerli firma fiyatı bulunamadı.`);
      const amount = price ? new Prisma.Decimal(price.amount.toString()) : null;
      return {
        productId: item.product.id, quantity: item.quantity, notes: item.notes, dimensions: item.product.dimensions, glassType: item.product.glassType,
        unitPrice: amount, lineTotal: amount?.mul(item.quantity) ?? null, priceListId: price?.priceList.id ?? null,
        priceMinQuantity: price?.minQuantity ?? null,
        priceScope: price ? (price.priceList.companyId ? "COMPANY" : price.priceList.customerGroupId ? "CUSTOMER_GROUP" : "PUBLIC") : null,
        currency: price?.priceList.currency ?? null,
      };
    });
    const currencies = [...new Set(snapshots.map((item) => item.currency).filter(Boolean))];
    if (currencies.length > 1) throw new Error("Sepette birden fazla para birimi bulunuyor. Lütfen satış ekibiyle görüşün.");
    const pricedSnapshots = snapshots.filter((item) => item.lineTotal);
    const subtotal = pricedSnapshots.reduce((sum, item) => sum.add(item.lineTotal!), new Prisma.Decimal(0));
    const quote = await tx.quoteRequest.create({
      data: {
        quoteNumber: `TKL-${pricedAt.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
        companyId: actor.companyId, requesterUserId: actor.userId, requesterName, requesterEmail,
        requesterPhone, desiredDeliveryDate: desiredDeliveryDate ? new Date(`${desiredDeliveryDate}T12:00:00.000Z`) : null,
        notes, status: "NEW", currency: currencies[0] ?? "TRY", estimatedSubtotal: pricedSnapshots.length ? subtotal : null,
        hasUnpricedItems: snapshots.some((item) => !item.unitPrice), submittedAt: pricedAt, pricedAt: null, idempotencyKey: input.idempotencyKey,
        requestHash, sourceCartId: cart.id, sourceCartVersion: cart.version,
        statusHistory: { create: { toStatus: "NEW", changedById: actor.userId, note: "Bayi teklif talebini gönderdi." } },
        items: { create: snapshots.map((item) => ({
          productId: item.productId, quantity: item.quantity, notes: item.notes, dimensions: item.dimensions,
          glassType: item.glassType, unitPrice: item.unitPrice, lineTotal: item.lineTotal, priceListId: item.priceListId,
          priceMinQuantity: item.priceMinQuantity, priceScope: item.priceScope,
        })) },
      },
      select: { id: true },
    });
    await tx.auditLog.create({ data: { actorUserId: actor.userId, action: "dealer.quote.submitted", entityType: "QuoteRequest", entityId: quote.id, metadata: JSON.stringify({ companyId: actor.companyId, itemCount: snapshots.length }) } });
    const consumed = await tx.quoteCart.deleteMany({ where: { id: cart.id, version: input.cartVersion } });
    if (consumed.count !== 1) throw new Error("Teklif sepetiniz değişti. Güncel sayfayı yükleyin.");
    return quote;
  });
}
