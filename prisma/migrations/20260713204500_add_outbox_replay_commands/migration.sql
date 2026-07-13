-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_IntegrationOutboxEvent" (
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
    "leaseExpiresAt" DATETIME,
    "lockToken" TEXT,
    "processedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntegrationOutboxEvent_status_check" CHECK ("status" IN ('PENDING', 'PROCESSING', 'RETRY', 'SUCCEEDED', 'DEAD')),
    CONSTRAINT "IntegrationOutboxEvent_attempts_check" CHECK ("attempts" >= 0 AND "maxAttempts" >= 1),
    CONSTRAINT "IntegrationOutboxEvent_lease_check" CHECK (
      ("status" = 'PROCESSING' AND "lockedAt" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL AND "lockToken" IS NOT NULL)
      OR ("status" <> 'PROCESSING' AND "lockedAt" IS NULL AND "leaseExpiresAt" IS NULL AND "lockToken" IS NULL)
    )
);

INSERT INTO "new_IntegrationOutboxEvent" (
    "id", "topic", "eventType", "aggregateType", "aggregateId", "providerCode",
    "payload", "idempotencyKey", "status", "attempts", "maxAttempts",
    "availableAt", "lockedAt", "leaseExpiresAt", "lockToken", "processedAt",
    "lastError", "createdAt", "updatedAt"
)
SELECT
    "id", "topic", "eventType", "aggregateType", "aggregateId", "providerCode",
    "payload", "idempotencyKey", "status", "attempts", "maxAttempts",
    "availableAt", "lockedAt", "leaseExpiresAt", "lockToken", "processedAt",
    "lastError", "createdAt", "updatedAt"
FROM "IntegrationOutboxEvent";

DROP TABLE "IntegrationOutboxEvent";
ALTER TABLE "new_IntegrationOutboxEvent" RENAME TO "IntegrationOutboxEvent";
CREATE UNIQUE INDEX "IntegrationOutboxEvent_idempotencyKey_key" ON "IntegrationOutboxEvent"("idempotencyKey");
CREATE INDEX "IntegrationOutboxEvent_status_availableAt_createdAt_idx" ON "IntegrationOutboxEvent"("status", "availableAt", "createdAt");
CREATE INDEX "IntegrationOutboxEvent_status_leaseExpiresAt_idx" ON "IntegrationOutboxEvent"("status", "leaseExpiresAt");
CREATE INDEX "IntegrationOutboxEvent_topic_status_availableAt_idx" ON "IntegrationOutboxEvent"("topic", "status", "availableAt");
CREATE INDEX "IntegrationOutboxEvent_aggregateType_aggregateId_createdAt_idx" ON "IntegrationOutboxEvent"("aggregateType", "aggregateId", "createdAt");

CREATE TABLE "IntegrationReplayCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "outboxEventId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "resultStatus" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationReplayCommand_outboxEventId_fkey" FOREIGN KEY ("outboxEventId") REFERENCES "IntegrationOutboxEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IntegrationReplayCommand_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IntegrationReplayCommand_requestId_key" ON "IntegrationReplayCommand"("requestId");
CREATE INDEX "IntegrationReplayCommand_outboxEventId_createdAt_idx" ON "IntegrationReplayCommand"("outboxEventId", "createdAt");
CREATE INDEX "IntegrationReplayCommand_actorUserId_createdAt_idx" ON "IntegrationReplayCommand"("actorUserId", "createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
