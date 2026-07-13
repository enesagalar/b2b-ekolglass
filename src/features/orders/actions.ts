"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireDealerContext } from "@/data/dealer-context";
import {
  addOrderCartProduct,
  removeOrderCartProduct,
  submitOrderCart,
  updateOrderCartProduct,
} from "@/data/order-cart";
import {
  dealerAddressCreateSchema,
  orderCartAddSchema,
  orderCartRemoveSchema,
  orderCartUpdateSchema,
  orderSubmitSchema,
} from "@/domain/validation";
import { prisma } from "@/lib/prisma";

export type OrderActionState = { message?: string; ok?: boolean };

async function actor(nextPath: string) {
  const { user, company } = await requireDealerContext(nextPath);
  return {
    userId: user.id,
    companyId: company.id,
    customerGroupId: company.customerGroup?.id,
    role: user.role as "DEALER_OWNER" | "DEALER_STAFF",
  };
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

export async function addOrderCartItemAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const parsed = orderCartAddSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  try {
    await addOrderCartProduct(await actor("/urunler"), parsed.data);
  } catch (error) {
    return { message: messageOf(error) };
  }
  revalidatePath("/sepet");
  redirect("/sepet?added=1");
}

export async function updateOrderCartItemAction(formData: FormData) {
  const parsed = orderCartUpdateSchema.safeParse({
    itemId: formData.get("itemId"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  await updateOrderCartProduct(await actor("/sepet"), parsed.data);
  revalidatePath("/sepet");
}

export async function removeOrderCartItemAction(formData: FormData) {
  const parsed = orderCartRemoveSchema.safeParse({
    itemId: formData.get("itemId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  await removeOrderCartProduct(await actor("/sepet"), parsed.data.itemId);
  revalidatePath("/sepet");
}

export async function createDealerAddressAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const context = await actor("/sepet");
  const parsed = dealerAddressCreateSchema.safeParse({
    label: formData.get("label"),
    line1: formData.get("line1"),
    line2: formData.get("line2"),
    district: formData.get("district"),
    city: formData.get("city"),
    postalCode: formData.get("postalCode"),
    isDefault: formData.get("isDefault"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault)
        await tx.address.updateMany({
          where: { companyId: context.companyId, isDefault: true },
          data: { isDefault: false },
        });
      const existingCount = await tx.address.count({
        where: { companyId: context.companyId },
      });
      await tx.address.create({
        data: {
          companyId: context.companyId,
          country: "TR",
          ...parsed.data,
          isDefault: parsed.data.isDefault || existingCount === 0,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.userId,
          action: "dealer.address.created",
          entityType: "Company",
          entityId: context.companyId,
        },
      });
    });
    revalidatePath("/sepet");
    revalidatePath("/bayi/hesabim");
    return { ok: true, message: "Teslimat adresi eklendi." };
  } catch (error) {
    return { message: messageOf(error) };
  }
}

export async function submitOrderCartAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const parsed = orderSubmitSchema.safeParse({
    cartId: formData.get("cartId"),
    cartVersion: formData.get("cartVersion"),
    deliveryAddressId: formData.get("deliveryAddressId"),
    shipmentMethod: formData.get("shipmentMethod"),
    notes: formData.get("notes"),
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  let order: { id: string };
  try {
    order = await submitOrderCart(await actor("/sepet"), parsed.data);
  } catch (error) {
    return { message: messageOf(error) };
  }
  revalidatePath("/bayi");
  revalidatePath("/bayi/siparisler");
  redirect(`/bayi/siparisler/${order.id}?created=1`);
}
