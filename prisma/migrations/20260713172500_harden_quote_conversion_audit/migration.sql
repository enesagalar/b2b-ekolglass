-- AlterTable
ALTER TABLE "Order" ADD COLUMN "sourceQuoteVersion" INTEGER;

-- AlterTable
ALTER TABLE "QuoteOfferRevisionItem" ADD COLUMN "dimensionsSnapshot" TEXT;
ALTER TABLE "QuoteOfferRevisionItem" ADD COLUMN "glassTypeSnapshot" TEXT;
ALTER TABLE "QuoteOfferRevisionItem" ADD COLUMN "productCodeSnapshot" TEXT;
ALTER TABLE "QuoteOfferRevisionItem" ADD COLUMN "productNameSnapshot" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL,
    "lineTotal" DECIMAL,
    "productCodeSnapshot" TEXT NOT NULL DEFAULT '',
    "productNameSnapshot" TEXT NOT NULL DEFAULT '',
    "dimensionsSnapshot" TEXT,
    "glassTypeSnapshot" TEXT NOT NULL DEFAULT '',
    "sourceProductPriceId" TEXT,
    "priceListId" TEXT,
    "priceMinQuantity" INTEGER,
    "priceScope" TEXT,
    "notes" TEXT,
    "sourceOfferRevisionItemId" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_sourceOfferRevisionItemId_fkey" FOREIGN KEY ("sourceOfferRevisionItemId") REFERENCES "QuoteOfferRevisionItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("dimensionsSnapshot", "glassTypeSnapshot", "id", "lineTotal", "notes", "orderId", "priceListId", "priceMinQuantity", "priceScope", "productCodeSnapshot", "productId", "productNameSnapshot", "quantity", "sourceProductPriceId", "unitPrice") SELECT "dimensionsSnapshot", "glassTypeSnapshot", "id", "lineTotal", "notes", "orderId", "priceListId", "priceMinQuantity", "priceScope", "productCodeSnapshot", "productId", "productNameSnapshot", "quantity", "sourceProductPriceId", "unitPrice" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE UNIQUE INDEX "OrderItem_sourceOfferRevisionItemId_key" ON "OrderItem"("sourceOfferRevisionItemId");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE UNIQUE INDEX "OrderItem_orderId_productId_key" ON "OrderItem"("orderId", "productId");

CREATE TABLE "new_QuoteOperationCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "resultVersion" INTEGER NOT NULL,
    "resultOrderId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteOperationCommand_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "QuoteRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuoteOperationCommand_resultOrderId_fkey" FOREIGN KEY ("resultOrderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuoteOperationCommand_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuoteOperationCommand" ("createdAt", "createdById", "fromStatus", "id", "idempotencyKey", "operation", "quoteId", "requestHash", "resultOrderId", "resultVersion", "toStatus") SELECT "createdAt", "createdById", "fromStatus", "id", "idempotencyKey", "operation", "quoteId", "requestHash", "resultOrderId", "resultVersion", "toStatus" FROM "QuoteOperationCommand";
DROP TABLE "QuoteOperationCommand";
ALTER TABLE "new_QuoteOperationCommand" RENAME TO "QuoteOperationCommand";
CREATE UNIQUE INDEX "QuoteOperationCommand_resultOrderId_key" ON "QuoteOperationCommand"("resultOrderId");
CREATE INDEX "QuoteOperationCommand_quoteId_createdAt_idx" ON "QuoteOperationCommand"("quoteId", "createdAt");
CREATE UNIQUE INDEX "QuoteOperationCommand_quoteId_idempotencyKey_key" ON "QuoteOperationCommand"("quoteId", "idempotencyKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
