-- DropIndex
DROP INDEX "Order_idempotencyKey_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "requestHash" TEXT;
ALTER TABLE "Order" ADD COLUMN "sourceCartId" TEXT;
ALTER TABLE "Order" ADD COLUMN "sourceCartVersion" INTEGER;

-- CreateTable
CREATE TABLE "CheckoutLock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderCart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderCart_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderCart_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OrderCart" ("companyId", "createdAt", "id", "ownerUserId", "updatedAt") SELECT "companyId", "createdAt", "id", "ownerUserId", "updatedAt" FROM "OrderCart";
DROP TABLE "OrderCart";
ALTER TABLE "new_OrderCart" RENAME TO "OrderCart";
CREATE INDEX "OrderCart_ownerUserId_idx" ON "OrderCart"("ownerUserId");
CREATE UNIQUE INDEX "OrderCart_companyId_ownerUserId_key" ON "OrderCart"("companyId", "ownerUserId");
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
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("id", "lineTotal", "notes", "orderId", "priceListId", "priceMinQuantity", "priceScope", "productCodeSnapshot", "productId", "productNameSnapshot", "quantity", "unitPrice") SELECT "id", "lineTotal", "notes", "orderId", "priceListId", "priceMinQuantity", "priceScope", "productCodeSnapshot", "productId", "productNameSnapshot", "quantity", "unitPrice" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE UNIQUE INDEX "OrderItem_orderId_productId_key" ON "OrderItem"("orderId", "productId");
CREATE TABLE "new_StockReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" DATETIME,
    "consumedAt" DATETIME,
    "releaseReason" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockReservation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockReservation_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StockReservation" ("createdAt", "id", "orderItemId", "quantity", "releasedAt", "status", "stockItemId", "updatedAt") SELECT "createdAt", "id", "orderItemId", "quantity", "releasedAt", "status", "stockItemId", COALESCE("createdAt", CURRENT_TIMESTAMP) FROM "StockReservation";
DROP TABLE "StockReservation";
ALTER TABLE "new_StockReservation" RENAME TO "StockReservation";
CREATE INDEX "StockReservation_stockItemId_status_idx" ON "StockReservation"("stockItemId", "status");
CREATE INDEX "StockReservation_status_expiresAt_idx" ON "StockReservation"("status", "expiresAt");
CREATE UNIQUE INDEX "StockReservation_orderItemId_stockItemId_key" ON "StockReservation"("orderItemId", "stockItemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Order_companyId_idempotencyKey_key" ON "Order"("companyId", "idempotencyKey");
