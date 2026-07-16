CREATE TABLE "SystemAlertState" (
    "jobKey" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'RESOLVED',
    "currentSeverity" TEXT NOT NULL DEFAULT 'none',
    "lastQueuedSeverity" TEXT,
    "lastEventType" TEXT,
    "reasonCode" TEXT,
    "correlationId" TEXT,
    "openedAt" DATETIME,
    "resolvedAt" DATETIME,
    "lastObservedAt" DATETIME NOT NULL,
    "lastQueuedAt" DATETIME,
    "lastDeliveredAt" DATETIME,
    "lastDeliveredEventType" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SystemAlertState_status_check" CHECK ("status" IN ('ACTIVE', 'RESOLVED')),
    CONSTRAINT "SystemAlertState_severity_check" CHECK ("currentSeverity" IN ('none', 'warning', 'critical')),
    CONSTRAINT "SystemAlertState_queued_severity_check" CHECK ("lastQueuedSeverity" IS NULL OR "lastQueuedSeverity" IN ('warning', 'critical')),
    CONSTRAINT "SystemAlertState_version_check" CHECK ("version" >= 0),
    CONSTRAINT "SystemAlertState_event_type_check" CHECK ("lastEventType" IS NULL OR "lastEventType" IN ('OPENED', 'ESCALATED', 'REMINDER', 'RECOVERED')),
    CONSTRAINT "SystemAlertState_delivered_event_type_check" CHECK ("lastDeliveredEventType" IS NULL OR "lastDeliveredEventType" IN ('OPENED', 'ESCALATED', 'REMINDER', 'RECOVERED')),
    CONSTRAINT "SystemAlertState_lifecycle_check" CHECK (
      ("status" = 'ACTIVE' AND "currentSeverity" IN ('warning', 'critical') AND "openedAt" IS NOT NULL)
      OR ("status" = 'RESOLVED' AND "currentSeverity" = 'none')
    )
);

CREATE INDEX "SystemAlertState_status_currentSeverity_lastObservedAt_idx"
ON "SystemAlertState"("status", "currentSeverity", "lastObservedAt");
