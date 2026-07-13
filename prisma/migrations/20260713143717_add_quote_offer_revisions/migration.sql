-- CreateTable
CREATE TABLE "QuoteOfferRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "validUntil" DATETIME,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteOfferRevision_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "QuoteRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuoteOfferRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteOfferRevisionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revisionId" TEXT NOT NULL,
    "quoteRequestItemId" TEXT NOT NULL,
    "quantitySnapshot" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "lineTotal" DECIMAL NOT NULL,
    CONSTRAINT "QuoteOfferRevisionItem_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "QuoteOfferRevision" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuoteOfferRevisionItem_quoteRequestItemId_fkey" FOREIGN KEY ("quoteRequestItemId") REFERENCES "QuoteRequestItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "activeOfferRevisionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuoteRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuoteRequest_activeOfferRevisionId_fkey" FOREIGN KEY ("activeOfferRevisionId") REFERENCES "QuoteOfferRevision" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuoteRequest" ("companyId", "createdAt", "currency", "customerType", "desiredDeliveryDate", "estimatedSubtotal", "hasUnpricedItems", "id", "idempotencyKey", "internalNotes", "notes", "pricedAt", "quoteNumber", "requesterEmail", "requesterName", "requesterPhone", "requesterUserId", "status", "submittedAt", "updatedAt", "version") SELECT "companyId", "createdAt", "currency", "customerType", "desiredDeliveryDate", "estimatedSubtotal", "hasUnpricedItems", "id", "idempotencyKey", "internalNotes", "notes", "pricedAt", "quoteNumber", "requesterEmail", "requesterName", "requesterPhone", "requesterUserId", "status", "submittedAt", "updatedAt", "version" FROM "QuoteRequest";
DROP TABLE "QuoteRequest";
ALTER TABLE "new_QuoteRequest" RENAME TO "QuoteRequest";
CREATE UNIQUE INDEX "QuoteRequest_quoteNumber_key" ON "QuoteRequest"("quoteNumber");
CREATE UNIQUE INDEX "QuoteRequest_idempotencyKey_key" ON "QuoteRequest"("idempotencyKey");
CREATE UNIQUE INDEX "QuoteRequest_activeOfferRevisionId_key" ON "QuoteRequest"("activeOfferRevisionId");
CREATE INDEX "QuoteRequest_companyId_status_createdAt_idx" ON "QuoteRequest"("companyId", "status", "createdAt");
CREATE INDEX "QuoteRequest_companyId_createdAt_idx" ON "QuoteRequest"("companyId", "createdAt");
CREATE INDEX "QuoteRequest_requesterUserId_status_createdAt_idx" ON "QuoteRequest"("requesterUserId", "status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "QuoteOfferRevision_quoteId_createdAt_idx" ON "QuoteOfferRevision"("quoteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteOfferRevision_quoteId_revisionNumber_key" ON "QuoteOfferRevision"("quoteId", "revisionNumber");

-- CreateIndex
CREATE INDEX "QuoteOfferRevisionItem_quoteRequestItemId_idx" ON "QuoteOfferRevisionItem"("quoteRequestItemId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteOfferRevisionItem_revisionId_quoteRequestItemId_key" ON "QuoteOfferRevisionItem"("revisionId", "quoteRequestItemId");
