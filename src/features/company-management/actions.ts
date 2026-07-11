"use server";

import { revalidatePath } from "next/cache";

import { activationInvitationSchema } from "@/domain/validation";
import { createActivationToken, getActivationExpiry, hashActivationToken } from "@/lib/activation-token";
import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActivationInvitationState = {
  ok: boolean;
  message: string;
  activationPath?: string;
  expiresAt?: string;
};

type ActivationInvitationInput = FormData | ActivationInvitationState;

const failure = (message: string): ActivationInvitationState => ({ ok: false, message });

function resolveFormData(input: ActivationInvitationInput, maybeFormData?: FormData) {
  return input instanceof FormData ? input : maybeFormData;
}

export async function createActivationInvitation(
  input: ActivationInvitationInput,
  maybeFormData?: FormData,
): Promise<ActivationInvitationState> {
  const actor = await requirePermissionUser("company.manage", "/admin/firmalar");
  const formData = resolveFormData(input, maybeFormData);

  if (!formData) {
    return failure("Form verisi alınamadı.");
  }

  const parsed = activationInvitationSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Davet bilgileri geçersiz.");
  }

  const manualDeliveryAllowed =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_MANUAL_ACTIVATION_LINKS === "true";

  if (!manualDeliveryAllowed) {
    return failure(
      "Production ortamında e-posta teslim adapterı bağlı değil. Manuel bağlantı için açık environment izni gerekir.",
    );
  }

  const rawToken = createActivationToken();
  const tokenHash = hashActivationToken(rawToken);
  const expiresAt = getActivationExpiry();

  try {
    const companyId = await prisma.$transaction(async (tx) => {
      const invitedUser = await tx.user.findFirst({
        where: {
          id: parsed.data.userId,
          role: { in: ["DEALER_OWNER", "DEALER_STAFF"] },
        },
        include: { company: { select: { id: true, status: true } } },
      });

      if (!invitedUser) {
        throw new Error("Firma kullanıcısı bulunamadı.");
      }

      if (invitedUser.status !== "INVITED") {
        throw new Error("Yalnızca aktivasyon bekleyen kullanıcılar için davet oluşturulabilir.");
      }

      if (!invitedUser.company || invitedUser.company.status !== "APPROVED") {
        throw new Error("Kullanıcının bağlı olduğu firma aktif onaylı durumda değil.");
      }

      const now = new Date();
      await tx.userActivationToken.updateMany({
        where: {
          userId: invitedUser.id,
          consumedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      await tx.userActivationToken.create({
        data: {
          userId: invitedUser.id,
          tokenHash,
          expiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "user.activation.invitation.created",
          entityType: "User",
          entityId: invitedUser.id,
          metadata: JSON.stringify({
            companyId: invitedUser.company.id,
            expiresAt: expiresAt.toISOString(),
          }),
        },
      });

      return invitedUser.company.id;
    });

    revalidatePath(`/admin/firmalar/${companyId}`);

    return {
      ok: true,
      message: "Tek kullanımlık aktivasyon bağlantısı hazırlandı.",
      activationPath: `/aktivasyon/${rawToken}`,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Aktivasyon bağlantısı oluşturulamadı.");
  }
}

export async function createActivationInvitationForm(
  previousState: ActivationInvitationState,
  formData: FormData,
) {
  return createActivationInvitation(previousState, formData);
}
