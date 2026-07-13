import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { addQuoteCartProduct, getQuoteCart, removeQuoteCartProduct, submitQuoteCart, updateQuoteCartProduct } from "@/data/quote-cart";
import { prisma } from "@/lib/prisma";

const suffix = Date.now().toString();
const ids = {
  companyA: `quote-cart-company-a-${suffix}`, companyB: `quote-cart-company-b-${suffix}`,
  userA: `quote-cart-user-a-${suffix}`, userB: `quote-cart-user-b-${suffix}`,
  category: `quote-cart-category-${suffix}`, product: `quote-cart-product-${suffix}`,
  companyList: `quote-cart-company-list-${suffix}`, publicList: `quote-cart-public-list-${suffix}`,
};
const actorA = { userId: ids.userA, companyId: ids.companyA, role: "DEALER_OWNER" as const };
const actorB = { userId: ids.userB, companyId: ids.companyB, role: "DEALER_OWNER" as const };

describe("quote cart pricing and tenant isolation", () => {
  beforeAll(async () => {
    await prisma.company.createMany({ data: [
      { id: ids.companyA, legalName: "Quote Cart A", displayName: "Quote A", email: `qa-${suffix}@example.com`, phone: "1", city: "Istanbul", status: "APPROVED" },
      { id: ids.companyB, legalName: "Quote Cart B", displayName: "Quote B", email: `qb-${suffix}@example.com`, phone: "2", city: "Ankara", status: "APPROVED" },
    ] });
    await prisma.user.createMany({ data: [
      { id: ids.userA, email: `quote-user-a-${suffix}@example.com`, name: "User A", role: "DEALER_OWNER", status: "ACTIVE", companyId: ids.companyA },
      { id: ids.userB, email: `quote-user-b-${suffix}@example.com`, name: "User B", role: "DEALER_OWNER", status: "ACTIVE", companyId: ids.companyB },
    ] });
    await prisma.productCategory.create({ data: { id: ids.category, slug: `quote-cart-${suffix}`, name: "Quote Cart Test" } });
    await prisma.product.create({ data: { id: ids.product, code: `QC-${suffix}`, name: "Tiered Product", categoryId: ids.category, glassType: "Lamine", orderMode: "QUOTE_OR_ORDER", status: "ACTIVE" } });
    await prisma.priceList.createMany({ data: [
      { id: ids.companyList, name: "Company Price", companyId: ids.companyA, currency: "TRY", priority: 10 },
      { id: ids.publicList, name: "Public Price", currency: "TRY", priority: 99 },
    ] });
    await prisma.productPrice.createMany({ data: [
      { productId: ids.product, priceListId: ids.companyList, minQuantity: 1, amount: 100 },
      { productId: ids.product, priceListId: ids.companyList, minQuantity: 10, amount: 80 },
      { productId: ids.product, priceListId: ids.publicList, minQuantity: 1, amount: 70 },
    ] });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [ids.userA, ids.userB] } } });
    await prisma.quoteStatusHistory.deleteMany({ where: { quote: { companyId: { in: [ids.companyA, ids.companyB] } } } });
    await prisma.quoteRequest.deleteMany({ where: { companyId: { in: [ids.companyA, ids.companyB] } } });
    await prisma.quoteCart.deleteMany({ where: { companyId: { in: [ids.companyA, ids.companyB] } } });
    await prisma.productPrice.deleteMany({ where: { productId: ids.product } });
    await prisma.priceList.deleteMany({ where: { id: { in: [ids.companyList, ids.publicList] } } });
    await prisma.product.delete({ where: { id: ids.product } });
    await prisma.productCategory.delete({ where: { id: ids.category } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.userA, ids.userB] } } });
    await prisma.company.deleteMany({ where: { id: { in: [ids.companyA, ids.companyB] } } });
  });

  it("blocks cross-company mutation and snapshots server-side tier pricing idempotently", async () => {
    const item = await addQuoteCartProduct(actorA, { productId: ids.product, quantity: 10 });
    await expect(removeQuoteCartProduct(actorB, item.id)).rejects.toThrow("Sepet kalemi bulunamadı");

    const cart = await getQuoteCart(actorA);
    expect(cart).not.toBeNull();
    const idempotencyKey = crypto.randomUUID();
    const input = { cartId: cart!.id, cartVersion: cart!.version, requesterName: "User A", requesterEmail: `quote-user-a-${suffix}@example.com`, idempotencyKey };
    const first = await submitQuoteCart(actorA, input);
    const second = await submitQuoteCart(actorA, input);
    expect(second.id).toBe(first.id);
    await expect(submitQuoteCart(actorA, { ...input, requesterName: "Forged Name" })).rejects.toThrow("farklı bir teklif isteğiyle");

    const quote = await prisma.quoteRequest.findUniqueOrThrow({ where: { id: first.id }, include: { items: true } });
    expect(quote.companyId).toBe(ids.companyA);
    expect(quote.requesterUserId).toBe(ids.userA);
    expect(quote.estimatedSubtotal?.toString()).toBe("800");
    expect(quote.items[0]?.unitPrice?.toString()).toBe("80");
    expect(quote.items[0]?.priceMinQuantity).toBe(10);
    expect(quote.items[0]?.priceScope).toBe("COMPANY");
    expect(quote.requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(quote.sourceCartId).toBe(cart!.id);
    expect(quote.sourceCartVersion).toBe(cart!.version);
    expect(await prisma.quoteCart.count({ where: { companyId: ids.companyA, ownerUserId: ids.userA } })).toBe(0);
  });

  it("rejects a stale quote cart version and preserves the current cart", async () => {
    const item = await addQuoteCartProduct(actorA, { productId: ids.product, quantity: 1 });
    const staleCart = await getQuoteCart(actorA);
    await updateQuoteCartProduct(actorA, { itemId: item.id, quantity: 2 });

    await expect(submitQuoteCart(actorA, {
      cartId: staleCart!.id,
      cartVersion: staleCart!.version,
      requesterName: "User A",
      requesterEmail: `quote-user-a-${suffix}@example.com`,
      idempotencyKey: crypto.randomUUID(),
    })).rejects.toThrow("Teklif sepetiniz değişti");

    const currentCart = await getQuoteCart(actorA);
    expect(currentCart?.version).toBe(staleCart!.version + 1);
    expect(currentCart?.items[0]?.quantity).toBe(2);
  });

  it("scopes idempotency keys by company", async () => {
    await addQuoteCartProduct(actorB, { productId: ids.product, quantity: 1 });
    const [cartA, cartB] = await Promise.all([getQuoteCart(actorA), getQuoteCart(actorB)]);
    const idempotencyKey = crypto.randomUUID();

    const [quoteA, quoteB] = await Promise.all([
      submitQuoteCart(actorA, { cartId: cartA!.id, cartVersion: cartA!.version, requesterName: "User A", requesterEmail: `quote-user-a-${suffix}@example.com`, idempotencyKey }),
      submitQuoteCart(actorB, { cartId: cartB!.id, cartVersion: cartB!.version, requesterName: "User B", requesterEmail: `quote-user-b-${suffix}@example.com`, idempotencyKey }),
    ]);

    expect(quoteA.id).not.toBe(quoteB.id);
    expect(await prisma.quoteRequest.count({ where: { idempotencyKey } })).toBe(2);
  });

  it("increments the cart version once per successful mutation", async () => {
    const item = await addQuoteCartProduct(actorA, { productId: ids.product, quantity: 1 });
    const afterAdd = await getQuoteCart(actorA);
    await updateQuoteCartProduct(actorA, { itemId: item.id, quantity: 3 });
    const afterUpdate = await getQuoteCart(actorA);
    await removeQuoteCartProduct(actorA, item.id);
    const afterRemove = await getQuoteCart(actorA);

    expect(afterUpdate!.version).toBe(afterAdd!.version + 1);
    expect(afterRemove!.version).toBe(afterUpdate!.version + 1);
  });
});
