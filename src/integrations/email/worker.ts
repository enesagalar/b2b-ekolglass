import "server-only";

import { processOutboxBatch } from "@/integrations/outbox";

import { createEmailHandlers } from "./handlers";

export async function runEmailOutboxOnce(workerId: string) {
  if (process.env.EMAIL_PROVIDER !== "smtp") return [];
  return processOutboxBatch(createEmailHandlers(), {
    workerId,
    limit: 1,
    leaseMs: 60_000,
  });
}
