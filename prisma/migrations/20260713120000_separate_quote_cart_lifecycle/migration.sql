ALTER TABLE "QuoteRequestItem" ADD COLUMN "lineTotal" DECIMAL;
ALTER TABLE "QuoteRequestItem" ADD COLUMN "priceListId" TEXT;
ALTER TABLE "QuoteRequestItem" ADD COLUMN "priceMinQuantity" INTEGER;
ALTER TABLE "QuoteRequestItem" ADD COLUMN "priceScope" TEXT;

CREATE TABLE "QuoteCart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteCart_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuoteCart_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "QuoteCartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "QuoteCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuoteCartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PriceList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "customerGroupId" TEXT,
    "companyId" TEXT,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceList_customerGroupId_fkey" FOREIGN KEY ("customerGroupId") REFERENCES "CustomerGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PriceList_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PriceList" ("companyId", "createdAt", "currency", "customerGroupId", "endsAt", "id", "isActive", "name", "startsAt", "updatedAt") SELECT "companyId", "createdAt", "currency", "customerGroupId", "endsAt", "id", "isActive", "name", "startsAt", "updatedAt" FROM "PriceList";
DROP TABLE "PriceList";
ALTER TABLE "new_PriceList" RENAME TO "PriceList";

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuoteRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuoteRequest" ("companyId", "createdAt", "currency", "customerType", "desiredDeliveryDate", "estimatedSubtotal", "hasUnpricedItems", "id", "internalNotes", "notes", "quoteNumber", "requesterEmail", "requesterName", "requesterPhone", "requesterUserId", "status", "submittedAt", "updatedAt") SELECT "companyId", "createdAt", "currency", "customerType", "desiredDeliveryDate", "estimatedSubtotal", "hasUnpricedItems", "id", "internalNotes", "notes", "quoteNumber", "requesterEmail", "requesterName", "requesterPhone", "requesterUserId", "status", "submittedAt", "updatedAt" FROM "QuoteRequest";
DROP TABLE "QuoteRequest";
ALTER TABLE "new_QuoteRequest" RENAME TO "QuoteRequest";
CREATE UNIQUE INDEX "QuoteRequest_quoteNumber_key" ON "QuoteRequest"("quoteNumber");
CREATE UNIQUE INDEX "QuoteRequest_idempotencyKey_key" ON "QuoteRequest"("idempotencyKey");
CREATE INDEX "QuoteRequest_companyId_status_createdAt_idx" ON "QuoteRequest"("companyId", "status", "createdAt");
CREATE INDEX "QuoteRequest_companyId_createdAt_idx" ON "QuoteRequest"("companyId", "createdAt");
CREATE INDEX "QuoteRequest_requesterUserId_status_createdAt_idx" ON "QuoteRequest"("requesterUserId", "status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE INDEX "QuoteCart_ownerUserId_idx" ON "QuoteCart"("ownerUserId");
CREATE UNIQUE INDEX "QuoteCart_companyId_ownerUserId_key" ON "QuoteCart"("companyId", "ownerUserId");
CREATE INDEX "QuoteCartItem_cartId_idx" ON "QuoteCartItem"("cartId");
CREATE UNIQUE INDEX "QuoteCartItem_cartId_productId_key" ON "QuoteCartItem"("cartId", "productId");
