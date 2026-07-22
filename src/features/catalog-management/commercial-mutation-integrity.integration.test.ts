import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requirePermissionUser: mocks.requirePermissionUser }));

import { updateCompanyDiscount } from "@/features/company-management/actions";
import { prisma } from "@/lib/prisma";
import { savePriceList, saveProductPrice } from "./actions";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const actorId = `commercial-actor-${suffix}`;
const companyId = `commercial-company-${suffix}`;
const categoryId = `commercial-category-${suffix}`;
const priceListId = `commercial-list-${suffix}`;
const productId = `commercial-product-${suffix}`;
const triggerNames = {
  list: `price_list_audit_${Date.now()}`,
  price: `product_price_audit_${Date.now()}`,
  company: `company_terms_audit_${Date.now()}`,
};

async function priceListForm(name: string, expectedUpdatedAt?: Date) {
  const list = await prisma.priceList.findUniqueOrThrow({ where: { id: priceListId } });
  const form = new FormData();
  form.set("id", priceListId);
  form.set("expectedUpdatedAt", (expectedUpdatedAt ?? list.updatedAt).toISOString());
  form.set("name", name);
  form.set("currency", "TRY");
  form.set("scope", "PUBLIC");
  form.set("startsAt", list.startsAt.toISOString());
  form.set("priority", "0");
  form.set("isActive", "on");
  return form;
}

async function productPriceForm(amount: string, expectedUpdatedAt?: Date) {
  const price = await prisma.productPrice.findUniqueOrThrow({
    where: { productId_priceListId_minQuantity: { productId, priceListId, minQuantity: 1 } },
  });
  const form = new FormData();
  form.set("id", price.id);
  form.set("expectedUpdatedAt", (expectedUpdatedAt ?? price.updatedAt).toISOString());
  form.set("productId", productId);
  form.set("priceListId", priceListId);
  form.set("minQuantity", "1");
  form.set("amount", amount);
  return form;
}

async function companyTermsForm(discountRate: string, expectedUpdatedAt?: Date) {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const form = new FormData();
  form.set("companyId", companyId);
  form.set("expectedUpdatedAt", (expectedUpdatedAt ?? company.updatedAt).toISOString());
  form.set("discountRate", discountRate);
  form.set("paymentTerms", "30 gün");
  form.set("creditPolicy", "LIMITED");
  form.set("creditLimit", "250000");
  form.set("changeReason", "Yıllık ticari koşullar güncellemesi");
  return form;
}

describe("commercial mutation integrity with SQLite", () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: { id: actorId, email: `${actorId}@example.com`, name: "Commercial Integrity", role: "ADMIN", status: "ACTIVE" },
    });
    await prisma.company.create({
      data: {
        id: companyId,
        legalName: "Commercial Integrity Ltd.",
        displayName: "Commercial Integrity",
        email: `${companyId}@example.com`,
        phone: "+90 212 000 00 00",
        city: "Istanbul",
        status: "APPROVED",
        discountRate: 5,
      },
    });
    await prisma.productCategory.create({ data: { id: categoryId, slug: categoryId, name: "Commercial Integrity" } });
    await prisma.priceList.create({ data: { id: priceListId, name: "Commercial Base", currency: "TRY", isActive: true } });
    await prisma.product.create({
      data: { id: productId, code: `COMM-${suffix}`, name: "Commercial Product", categoryId, glassType: "Temperli", status: "DRAFT" },
    });
    await prisma.productPrice.create({ data: { productId, priceListId, amount: 100, minQuantity: 1 } });
    mocks.requirePermissionUser.mockResolvedValue({ id: actorId, role: "ADMIN" });
  });

  afterEach(async () => {
    for (const name of Object.values(triggerNames)) {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${name}"`);
    }
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.productPrice.update({
      where: { productId_priceListId_minQuantity: { productId, priceListId, minQuantity: 1 } },
      data: { amount: 100 },
    });
    await prisma.priceList.update({
      where: { id: priceListId },
      data: { name: "Commercial Base", currency: "TRY", companyId: null, customerGroupId: null, priority: 0, isActive: true },
    });
    await prisma.company.update({
      where: { id: companyId },
      data: { discountRate: 5, paymentTerms: null, creditPolicy: "UNSET", creditLimit: null },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.priceList.deleteMany({ where: { id: priceListId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
  });

  it("rolls a price-list update back when its audit insert fails", async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerNames.list}"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW."action" = 'price_list.update'
      BEGIN SELECT RAISE(ABORT, 'secret price-list audit failure'); END
    `);

    const state = await savePriceList(await priceListForm("Unaudited List"));

    expect(state.ok).toBe(false);
    expect(state.message).toMatch(/Destek kodu: [0-9a-f-]{36}$/);
    expect(state.message).not.toContain("secret price-list audit failure");
    expect((await prisma.priceList.findUniqueOrThrow({ where: { id: priceListId } })).name).toBe("Commercial Base");
  });

  it("allows only the first price-list form with the same version", async () => {
    const version = (await prisma.priceList.findUniqueOrThrow({ where: { id: priceListId } })).updatedAt;
    const first = await savePriceList(await priceListForm("First Update", version));
    const second = await savePriceList(await priceListForm("Stale Update", version));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.message).toContain("Sayfayı yenileyin");
    expect((await prisma.priceList.findUniqueOrThrow({ where: { id: priceListId } })).name).toBe("First Update");
    expect(await prisma.auditLog.count({ where: { actorUserId: actorId, action: "price_list.update" } })).toBe(1);
  });

  it("rolls a product-price update back and audits the real price entity", async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerNames.price}"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW."action" = 'product_price.update'
      BEGIN SELECT RAISE(ABORT, 'secret product-price audit failure'); END
    `);
    const failed = await saveProductPrice(await productPriceForm("175"));
    expect(failed.ok).toBe(false);
    expect((await prisma.productPrice.findUniqueOrThrow({
      where: { productId_priceListId_minQuantity: { productId, priceListId, minQuantity: 1 } },
    })).amount.toString()).toBe("100");

    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerNames.price}"`);
    const version = (await prisma.productPrice.findUniqueOrThrow({
      where: { productId_priceListId_minQuantity: { productId, priceListId, minQuantity: 1 } },
    })).updatedAt;
    const succeeded = await saveProductPrice(await productPriceForm("175", version));
    expect(succeeded.ok).toBe(true);
    const stale = await saveProductPrice(await productPriceForm("190", version));
    expect(stale.ok).toBe(false);
    expect(stale.message).toContain("Sayfayı yenileyin");
    const price = await prisma.productPrice.findUniqueOrThrow({
      where: { productId_priceListId_minQuantity: { productId, priceListId, minQuantity: 1 } },
    });
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { actorUserId: actorId, action: "product_price.update" } });
    expect(audit.entityId).toBe(price.id);
    expect(JSON.parse(audit.metadata ?? "{}")).toMatchObject({ previousAmount: "100", amount: "175" });
    expect(price.amount.toString()).toBe("175");
  });

  it("rejects stale company terms and sanitizes audit persistence failures", async () => {
    const version = (await prisma.company.findUniqueOrThrow({ where: { id: companyId } })).updatedAt;
    const first = await updateCompanyDiscount({ ok: false, message: "" }, await companyTermsForm("10", version));
    const stale = await updateCompanyDiscount({ ok: false, message: "" }, await companyTermsForm("20", version));
    expect(first.ok).toBe(true);
    expect(stale.ok).toBe(false);
    expect(stale.message).toContain("Sayfayı yenileyin");

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerNames.company}"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW."action" = 'company.discount.updated'
      BEGIN SELECT RAISE(ABORT, 'secret company audit failure'); END
    `);
    const failed = await updateCompanyDiscount({ ok: false, message: "" }, await companyTermsForm("25"));
    expect(failed.ok).toBe(false);
    expect(failed.message).toMatch(/Destek kodu: [0-9a-f-]{36}$/);
    expect(failed.message).not.toContain("secret company audit failure");
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyId } })).discountRate.toString()).toBe("10");
  });
});
