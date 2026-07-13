"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { convertApprovedQuoteToOrder } from "@/data/quote-conversion";
import {
  priceQuote,
  QuoteOperationError,
  transitionQuoteStatus,
} from "@/data/quote-operations";
import { getQuoteTransitionPermission } from "@/domain/quote-transitions";
import {
  quotePricingSchema,
  quoteConversionSchema,
  quoteStatusTransitionSchema,
} from "@/domain/validation";
import { requirePermissionUser } from "@/lib/auth";

export type AdminQuoteActionState = {
  ok?: boolean;
  conflict?: boolean;
  message?: string;
};

function errorState(error: unknown): AdminQuoteActionState {
  return {
    ok: false,
    conflict:
      error instanceof QuoteOperationError && error.code === "CONFLICT",
    message:
      error instanceof Error ? error.message : "İşlem tamamlanamadı.",
  };
}

function revalidateQuote(quoteId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/teklifler");
  revalidatePath(`/admin/teklifler/${quoteId}`);
  revalidatePath("/bayi");
  revalidatePath("/bayi/teklifler");
  revalidatePath("/bayi/teklifler/[id]", "page");
}

export async function transitionQuoteStatusAction(
  _state: AdminQuoteActionState,
  formData: FormData,
): Promise<AdminQuoteActionState> {
  const parsed = quoteStatusTransitionSchema.safeParse({
    quoteId: formData.get("quoteId"),
    expectedStatus: formData.get("expectedStatus"),
    expectedVersion: formData.get("expectedVersion"),
    targetStatus: formData.get("targetStatus"),
    idempotencyKey: formData.get("idempotencyKey"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const permission = getQuoteTransitionPermission(parsed.data.targetStatus);
  const actor = await requirePermissionUser(
    permission,
    `/admin/teklifler/${parsed.data.quoteId}`,
  );
  try {
    await transitionQuoteStatus({ userId: actor.id }, parsed.data);
  } catch (error) {
    return errorState(error);
  }
  revalidateQuote(parsed.data.quoteId);
  return { ok: true, message: "Teklif durumu güncellendi." };
}

export async function priceQuoteAction(
  _state: AdminQuoteActionState,
  formData: FormData,
): Promise<AdminQuoteActionState> {
  const itemIds = formData.getAll("itemId");
  const unitPrices = formData.getAll("unitPrice");
  const parsed = quotePricingSchema.safeParse({
    quoteId: formData.get("quoteId"),
    expectedStatus: formData.get("expectedStatus"),
    expectedVersion: formData.get("expectedVersion"),
    idempotencyKey: formData.get("idempotencyKey"),
    currency: formData.get("currency"),
    internalNotes: formData.get("internalNotes"),
    items: itemIds.map((itemId, index) => ({
      itemId,
      unitPrice: unitPrices[index],
    })),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const actor = await requirePermissionUser(
    "quote.price",
    `/admin/teklifler/${parsed.data.quoteId}`,
  );
  try {
    await priceQuote({ userId: actor.id }, parsed.data);
  } catch (error) {
    return errorState(error);
  }
  revalidateQuote(parsed.data.quoteId);
  return { ok: true, message: "Teklif fiyatları kaydedildi." };
}

export async function convertQuoteToOrderAction(
  _state: AdminQuoteActionState,
  formData: FormData,
): Promise<AdminQuoteActionState> {
  const parsed = quoteConversionSchema.safeParse({
    quoteId: formData.get("quoteId"),
    expectedVersion: formData.get("expectedVersion"),
    expectedOfferRevisionId: formData.get("expectedOfferRevisionId"),
    deliveryAddressId: formData.get("deliveryAddressId"),
    shipmentMethod: formData.get("shipmentMethod"),
    notes: formData.get("notes"),
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const actor = await requirePermissionUser(
    "quote.convert",
    `/admin/teklifler/${parsed.data.quoteId}`,
  );
  let order: { id: string };
  try {
    order = await convertApprovedQuoteToOrder({ userId: actor.id }, parsed.data);
  } catch (error) {
    return errorState(error);
  }

  revalidateQuote(parsed.data.quoteId);
  revalidatePath("/admin/siparisler");
  revalidatePath(`/admin/siparisler/${order.id}`);
  revalidatePath("/bayi/siparisler");
  revalidatePath(`/bayi/siparisler/${order.id}`);
  redirect(`/admin/siparisler/${order.id}?created=quote`);
}
