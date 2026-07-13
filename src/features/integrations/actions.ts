"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { OutboxReplayError, replayOutboxEvent } from "@/data/admin-integrations";
import { requirePermissionUser } from "@/lib/auth";

const schema = z.object({
  eventId: z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/),
  requestId: z.string().uuid(),
  expectedStatus: z.enum(["DEAD", "RETRY"]),
  expectedAttempts: z.coerce.number().int().min(0),
  expectedUpdatedAt: z.coerce.date(),
  reason: z.string().trim().max(300).optional(),
}).superRefine((value, context) => {
  if (value.expectedStatus === "DEAD" && (!value.reason || value.reason.length < 10)) {
    context.addIssue({
      code: "custom",
      path: ["reason"],
      message: "Dead-letter replay için en az 10 karakter gerekçe girin.",
    });
  }
});

export type OutboxReplayState = {
  ok: boolean;
  message: string;
  conflict?: boolean;
};

export async function replayOutboxEventAction(
  _previousState: OutboxReplayState,
  formData: FormData,
): Promise<OutboxReplayState> {
  const parsed = schema.safeParse({
    eventId: formData.get("eventId"),
    requestId: formData.get("requestId"),
    expectedStatus: formData.get("expectedStatus"),
    expectedAttempts: formData.get("expectedAttempts"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Outbox kaydı geçersiz." };

  const actor = await requirePermissionUser(
    "integration.replay",
    "/admin/entegrasyonlar",
  );
  try {
    await replayOutboxEvent(actor.id, parsed.data);
    revalidatePath("/admin");
    revalidatePath("/admin/entegrasyonlar");
    return {
      ok: true,
      message:
        parsed.data.expectedStatus === "DEAD"
          ? "Kayıt güvenli biçimde yeniden kuyruğa alındı."
          : "Otomatik retry beklemeden öne çekildi.",
    };
  } catch (error) {
    if (error instanceof OutboxReplayError) {
      return {
        ok: false,
        message: error.message,
        conflict: error.code === "CONFLICT",
      };
    }
    return { ok: false, message: "Outbox kaydı yeniden kuyruğa alınamadı." };
  }
}
