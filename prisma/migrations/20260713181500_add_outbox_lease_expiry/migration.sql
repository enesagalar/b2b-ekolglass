-- AlterTable
ALTER TABLE "IntegrationOutboxEvent" ADD COLUMN "leaseExpiresAt" DATETIME;

-- CreateIndex
CREATE INDEX "IntegrationOutboxEvent_status_leaseExpiresAt_idx"
ON "IntegrationOutboxEvent"("status", "leaseExpiresAt");
