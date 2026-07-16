ALTER TABLE "SystemJobRun" ADD COLUMN "leaseToken" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SystemJobRun" ADD COLUMN "heartbeatAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "SystemJobState" (
    "jobKey" TEXT NOT NULL PRIMARY KEY,
    "currentRunId" TEXT,
    "leaseToken" TEXT,
    "leaseExpiresAt" DATETIME,
    "lastStartedAt" DATETIME,
    "lastHeartbeatAt" DATETIME,
    "lastCompletedAt" DATETIME,
    "lastSucceededAt" DATETIME,
    "lastFailedAt" DATETIME,
    "lastStatus" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastDurationMs" INTEGER,
    "lastResultCount" INTEGER,
    "lastErrorCode" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SystemJobState_failure_check" CHECK ("consecutiveFailures" >= 0),
    CONSTRAINT "SystemJobState_status_check" CHECK ("lastStatus" IS NULL OR "lastStatus" IN ('RUNNING', 'SUCCEEDED', 'FAILED'))
);

CREATE INDEX "SystemJobState_leaseExpiresAt_idx" ON "SystemJobState"("leaseExpiresAt");
CREATE INDEX "SystemJobState_lastStatus_lastCompletedAt_idx" ON "SystemJobState"("lastStatus", "lastCompletedAt");
