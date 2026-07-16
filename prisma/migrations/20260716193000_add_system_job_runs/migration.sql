CREATE TABLE "SystemJobRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "trigger" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "durationMs" INTEGER,
    "resultCount" INTEGER,
    "errorCode" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SystemJobRun_status_check" CHECK ("status" IN ('RUNNING', 'SUCCEEDED', 'FAILED')),
    CONSTRAINT "SystemJobRun_duration_check" CHECK ("durationMs" IS NULL OR "durationMs" >= 0),
    CONSTRAINT "SystemJobRun_result_check" CHECK ("resultCount" IS NULL OR "resultCount" >= 0)
);

CREATE UNIQUE INDEX "SystemJobRun_runId_key" ON "SystemJobRun"("runId");
CREATE INDEX "SystemJobRun_jobKey_startedAt_idx" ON "SystemJobRun"("jobKey", "startedAt");
CREATE INDEX "SystemJobRun_status_startedAt_idx" ON "SystemJobRun"("status", "startedAt");
