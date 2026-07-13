-- CreateTable
CREATE TABLE "IntegrationOutboxEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "providerCode" TEXT,
    "payload" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" DATETIME,
    "lockToken" TEXT,
    "processedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IntegrationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT,
    "direction" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "requestSummary" TEXT,
    "responseSummary" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "outboxEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ShippingProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IntegrationLog_outboxEventId_fkey" FOREIGN KEY ("outboxEventId") REFERENCES "IntegrationOutboxEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IntegrationLog" ("createdAt", "direction", "entityId", "entityType", "errorMessage", "id", "operation", "providerId", "requestSummary", "responseSummary", "retryCount", "status") SELECT "createdAt", "direction", "entityId", "entityType", "errorMessage", "id", "operation", "providerId", "requestSummary", "responseSummary", "retryCount", "status" FROM "IntegrationLog";
DROP TABLE "IntegrationLog";
ALTER TABLE "new_IntegrationLog" RENAME TO "IntegrationLog";
CREATE INDEX "IntegrationLog_providerId_createdAt_idx" ON "IntegrationLog"("providerId", "createdAt");
CREATE INDEX "IntegrationLog_entityType_entityId_idx" ON "IntegrationLog"("entityType", "entityId");
CREATE INDEX "IntegrationLog_outboxEventId_createdAt_idx" ON "IntegrationLog"("outboxEventId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationOutboxEvent_idempotencyKey_key" ON "IntegrationOutboxEvent"("idempotencyKey");
CREATE INDEX "IntegrationOutboxEvent_status_availableAt_createdAt_idx" ON "IntegrationOutboxEvent"("status", "availableAt", "createdAt");
CREATE INDEX "IntegrationOutboxEvent_topic_status_availableAt_idx" ON "IntegrationOutboxEvent"("topic", "status", "availableAt");
CREATE INDEX "IntegrationOutboxEvent_aggregateType_aggregateId_createdAt_idx" ON "IntegrationOutboxEvent"("aggregateType", "aggregateId", "createdAt");
