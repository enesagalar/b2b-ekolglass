import "server-only";

import { systemAlertOutboxTopic } from "@/domain/integration-topics";
import type { OutboxHandlerRegistry } from "@/integrations/outbox";
import { prisma } from "@/lib/prisma";

import { systemAlertPayloadSchema } from "./types";
import { sendSystemAlertWebhook } from "./webhook-provider";

export function createSystemAlertHandlers(): OutboxHandlerRegistry {
  return {
    [systemAlertOutboxTopic]: async (input, context) => {
      const payload = systemAlertPayloadSchema.parse(input);
      const response = await sendSystemAlertWebhook(payload, context);
      await prisma.systemAlertState.updateMany({
        where: { jobKey: payload.jobKey, version: payload.version },
        data: { lastDeliveredAt: new Date(), lastDeliveredEventType: payload.eventType },
      });
      return response;
    },
  };
}
