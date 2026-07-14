"use server";

import { revalidatePath } from "next/cache";

import {
  OrderTransitionError,
  transitionOrderStatus,
} from "@/data/order-operations";
import { getOrderTransitionPermission } from "@/domain/order-transitions";
import { orderStatusTransitionSchema } from "@/domain/validation";
import { requirePermissionUser } from "@/lib/auth";

export type AdminOrderActionState = {
  ok: boolean;
  message: string;
  conflict?: boolean;
};

export async function transitionOrderStatusAction(
  _state: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  const parsed = orderStatusTransitionSchema.safeParse({
    orderId: formData.get("orderId"),
    expectedStatus: formData.get("expectedStatus"),
    expectedVersion: formData.get("expectedVersion"),
    targetStatus: formData.get("targetStatus"),
    idempotencyKey: formData.get("idempotencyKey"),
    note: formData.get("note") || undefined,
    carrier: formData.get("carrier") || undefined,
    trackingNumber: formData.get("trackingNumber") || undefined,
    commercialOverrideReason:
      formData.get("commercialOverrideReason") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Sipariş bilgileri geçersiz.",
    };
  }

  const permission = getOrderTransitionPermission(
    parsed.data.expectedStatus,
    parsed.data.targetStatus,
  );
  const actor = await requirePermissionUser(
    permission,
    `/admin/siparisler/${parsed.data.orderId}`,
  );
  let canOverrideCredit = false;
  if (parsed.data.commercialOverrideReason) {
    await requirePermissionUser(
      "order.credit.override",
      `/admin/siparisler/${parsed.data.orderId}`,
    );
    canOverrideCredit = true;
  }
  try {
    await transitionOrderStatus(
      {
        userId: actor.id,
        ...(canOverrideCredit ? { canOverrideCredit: true } : {}),
      },
      parsed.data,
    );
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Sipariş durumu güncellenemedi.",
      conflict:
        error instanceof OrderTransitionError && error.code === "CONFLICT",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/siparisler");
  revalidatePath(`/admin/siparisler/${parsed.data.orderId}`);
  revalidatePath("/bayi");
  revalidatePath("/bayi/siparisler");
  revalidatePath(`/bayi/siparisler/${parsed.data.orderId}`);
  return { ok: true, message: "Sipariş durumu güncellendi." };
}
