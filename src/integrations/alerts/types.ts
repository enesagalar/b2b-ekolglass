import { z } from "zod";

export const systemAlertEventTypes = ["OPENED", "ESCALATED", "REMINDER", "RECOVERED"] as const;

export const systemAlertPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  eventType: z.enum(systemAlertEventTypes),
  jobKey: z.string().min(1).max(100),
  jobLabel: z.string().min(1).max(160),
  severity: z.enum(["none", "warning", "critical"]),
  priorSeverity: z.enum(["none", "warning", "critical"]),
  jobStatus: z.string().min(1).max(40),
  reasonCode: z.string().min(1).max(100),
  fingerprint: z.string().min(1).max(220),
  observedAt: z.string().datetime(),
  correlationId: z.string().uuid().nullable(),
  version: z.number().int().positive(),
});

export type SystemAlertPayload = z.infer<typeof systemAlertPayloadSchema>;
