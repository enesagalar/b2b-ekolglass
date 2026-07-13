-- CreateTable
CREATE TABLE "QuoteStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteStatusHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "QuoteRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuoteStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteOperationCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "resultVersion" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteOperationCommand_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "QuoteRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuoteOperationCommand_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuoteRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNumber" TEXT NOT NULL,
    "companyId" TEXT,
    "requesterUserId" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterPhone" TEXT,
    "customerType" TEXT,
    "desiredDeliveryDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "internalNotes" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "estimatedSubtotal" DECIMAL,
    "hasUnpricedItems" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" DATETIME,
    "pricedAt" DATETIME,
    "idempotencyKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuoteRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuoteRequest" ("companyId", "createdAt", "currency", "customerType", "desiredDeliveryDate", "estimatedSubtotal", "hasUnpricedItems", "id", "idempotencyKey", "internalNotes", "notes", "pricedAt", "quoteNumber", "requesterEmail", "requesterName", "requesterPhone", "requesterUserId", "status", "submittedAt", "updatedAt") SELECT "companyId", "createdAt", "currency", "customerType", "desiredDeliveryDate", "estimatedSubtotal", "hasUnpricedItems", "id", "idempotencyKey", "internalNotes", "notes", "pricedAt", "quoteNumber", "requesterEmail", "requesterName", "requesterPhone", "requesterUserId", "status", "submittedAt", "updatedAt" FROM "QuoteRequest";
DROP TABLE "QuoteRequest";
ALTER TABLE "new_QuoteRequest" RENAME TO "QuoteRequest";
CREATE UNIQUE INDEX "QuoteRequest_quoteNumber_key" ON "QuoteRequest"("quoteNumber");
CREATE UNIQUE INDEX "QuoteRequest_idempotencyKey_key" ON "QuoteRequest"("idempotencyKey");
CREATE INDEX "QuoteRequest_companyId_status_createdAt_idx" ON "QuoteRequest"("companyId", "status", "createdAt");
CREATE INDEX "QuoteRequest_companyId_createdAt_idx" ON "QuoteRequest"("companyId", "createdAt");
CREATE INDEX "QuoteRequest_requesterUserId_status_createdAt_idx" ON "QuoteRequest"("requesterUserId", "status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "QuoteStatusHistory_quoteId_createdAt_idx" ON "QuoteStatusHistory"("quoteId", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteOperationCommand_quoteId_createdAt_idx" ON "QuoteOperationCommand"("quoteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteOperationCommand_quoteId_idempotencyKey_key" ON "QuoteOperationCommand"("quoteId", "idempotencyKey");
