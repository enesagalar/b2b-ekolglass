-- AlterTable
ALTER TABLE "QuoteRequestItem" ADD COLUMN "unitPrice" DECIMAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuoteRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNumber" TEXT NOT NULL,
    "companyId" TEXT,
    "requesterUserId" TEXT,
    "draftOwnerKey" TEXT,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuoteRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuoteRequest" ("companyId", "createdAt", "customerType", "desiredDeliveryDate", "id", "internalNotes", "notes", "quoteNumber", "requesterEmail", "requesterName", "requesterPhone", "status", "updatedAt") SELECT "companyId", "createdAt", "customerType", "desiredDeliveryDate", "id", "internalNotes", "notes", "quoteNumber", "requesterEmail", "requesterName", "requesterPhone", "status", "updatedAt" FROM "QuoteRequest";
DROP TABLE "QuoteRequest";
ALTER TABLE "new_QuoteRequest" RENAME TO "QuoteRequest";
CREATE UNIQUE INDEX "QuoteRequest_quoteNumber_key" ON "QuoteRequest"("quoteNumber");
CREATE UNIQUE INDEX "QuoteRequest_draftOwnerKey_key" ON "QuoteRequest"("draftOwnerKey");
CREATE INDEX "QuoteRequest_companyId_status_createdAt_idx" ON "QuoteRequest"("companyId", "status", "createdAt");
CREATE INDEX "QuoteRequest_companyId_createdAt_idx" ON "QuoteRequest"("companyId", "createdAt");
CREATE INDEX "QuoteRequest_requesterUserId_status_createdAt_idx" ON "QuoteRequest"("requesterUserId", "status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequestItem_quoteRequestId_productId_key" ON "QuoteRequestItem"("quoteRequestId", "productId");
