"use server";

import { revalidatePath } from "next/cache";

import {
  priceQuote,
  QuoteOperationError,
  transitionQuoteStatus,
} from "@/data/quote-operations";
import { getQuoteTransitionPermission } from "@/domain/quote-transitions";
import {
  quotePricingSchema,
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
