import "server-only";

import { processOutboxBatch } from "@/integrations/outbox";

import { createSystemAlertHandlers } from "./handlers";

export async function runSystemAlertOutboxOnce(workerId: string) {
  if (process.env.SYSTEM_ALERT_PROVIDER !== "webhook") return [];
  return processOutboxBatch(createSystemAlertHandlers(), { workerId, limit: 10, leaseMs: 60_000 });
}
