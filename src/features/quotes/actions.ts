"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireDealerContext } from "@/data/dealer-context";
import { addQuoteCartProduct, removeQuoteCartProduct, submitQuoteCart, updateQuoteCartProduct } from "@/data/quote-cart";
import { quoteCartAddSchema, quoteCartRemoveSchema, quoteCartUpdateSchema, quoteSubmitSchema } from "@/domain/validation";

export type QuoteActionState = { message?: string };

async function actor(nextPath: string) {
  const { user, company } = await requireDealerContext(nextPath);
  return { userId: user.id, companyId: company.id, customerGroupId: company.customerGroup?.id, role: user.role as "DEALER_OWNER" | "DEALER_STAFF" };
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

export async function addQuoteCartItemAction(_state: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const parsed = quoteCartAddSchema.safeParse({ productId: formData.get("productId"), quantity: formData.get("quantity"), notes: formData.get("notes") });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  try {
    await addQuoteCartProduct(await actor("/bayi/urunler"), parsed.data);
  } catch (error) {
    return { message: messageOf(error) };
  }
  revalidatePath("/bayi/teklif-sepeti");
  redirect("/bayi/teklif-sepeti?added=1");
}

export async function updateQuoteCartItemAction(formData: FormData) {
  const parsed = quoteCartUpdateSchema.safeParse({ itemId: formData.get("itemId"), quantity: formData.get("quantity"), notes: formData.get("notes") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  await updateQuoteCartProduct(await actor("/bayi/teklif-sepeti"), parsed.data);
  revalidatePath("/bayi/teklif-sepeti");
}

export async function removeQuoteCartItemAction(formData: FormData) {
  const parsed = quoteCartRemoveSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  await removeQuoteCartProduct(await actor("/bayi/teklif-sepeti"), parsed.data.itemId);
  revalidatePath("/bayi/teklif-sepeti");
}

export async function submitQuoteCartAction(_state: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const parsed = quoteSubmitSchema.safeParse({
    requesterName: formData.get("requesterName"), requesterEmail: formData.get("requesterEmail"), requesterPhone: formData.get("requesterPhone"),
    desiredDeliveryDate: formData.get("desiredDeliveryDate"), notes: formData.get("notes"), idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  let quote: { id: string };
  try {
    quote = await submitQuoteCart(await actor("/bayi/teklif-sepeti"), parsed.data);
  } catch (error) {
    return { message: messageOf(error) };
  }
  revalidatePath("/bayi");
  revalidatePath("/bayi/teklifler");
  redirect(`/bayi/teklifler/${quote.id}?created=1`);
}
