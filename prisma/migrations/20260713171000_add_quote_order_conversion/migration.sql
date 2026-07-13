-- AlterTable
ALTER TABLE "QuoteOperationCommand" ADD COLUMN "resultOrderId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "deliveryAddressId" TEXT,
    "deliveryLabel" TEXT,
    "deliveryLine1" TEXT,
    "deliveryLine2" TEXT,
    "deliveryDistrict" TEXT,
    "deliveryCity" TEXT,
    "deliveryCountry" TEXT,
    "deliveryPostalCode" TEXT,
    "requestedDeliveryDate" DATETIME,
    "shipmentMethod" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "submittedAt" DATETIME,
    "pricedAt" DATETIME,
    "idempotencyKey" TEXT,
    "requestHash" TEXT,
    "sourceCartId" TEXT,
    "sourceCartVersion" INTEGER,
    "sourceQuoteId" TEXT,
    "sourceOfferRevisionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "heldFromStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "Address" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_sourceQuoteId_fkey" FOREIGN KEY ("sourceQuoteId") REFERENCES "QuoteRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_sourceOfferRevisionId_fkey" FOREIGN KEY ("sourceOfferRevisionId") REFERENCES "QuoteOfferRevision" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("approvedById", "companyId", "createdAt", "createdById", "currency", "deliveryAddressId", "deliveryCity", "deliveryCountry", "deliveryDistrict", "deliveryLabel", "deliveryLine1", "deliveryLine2", "deliveryPostalCode", "heldFromStatus", "id", "idempotencyKey", "internalNotes", "notes", "orderNumber", "pricedAt", "requestHash", "shipmentMethod", "sourceCartId", "sourceCartVersion", "status", "submittedAt", "subtotal", "updatedAt", "version") SELECT "approvedById", "companyId", "createdAt", "createdById", "currency", "deliveryAddressId", "deliveryCity", "deliveryCountry", "deliveryDistrict", "deliveryLabel", "deliveryLine1", "deliveryLine2", "deliveryPostalCode", "heldFromStatus", "id", "idempotencyKey", "internalNotes", "notes", "orderNumber", "pricedAt", "requestHash", "shipmentMethod", "sourceCartId", "sourceCartVersion", "status", "submittedAt", "subtotal", "updatedAt", "version" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_sourceQuoteId_key" ON "Order"("sourceQuoteId");
CREATE UNIQUE INDEX "Order_sourceOfferRevisionId_key" ON "Order"("sourceOfferRevisionId");
CREATE INDEX "Order_companyId_status_createdAt_idx" ON "Order"("companyId", "status", "createdAt");
CREATE INDEX "Order_companyId_createdAt_idx" ON "Order"("companyId", "createdAt");
CREATE UNIQUE INDEX "Order_companyId_idempotencyKey_key" ON "Order"("companyId", "idempotencyKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
