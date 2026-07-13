-- CreateTable
CREATE TABLE "OrderTransitionCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "resultVersion" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderTransitionCommand_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderTransitionCommand_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
    "version" INTEGER NOT NULL DEFAULT 1,
    "heldFromStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "Address" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("approvedById", "companyId", "createdAt", "createdById", "currency", "deliveryAddressId", "deliveryCity", "deliveryCountry", "deliveryDistrict", "deliveryLabel", "deliveryLine1", "deliveryLine2", "deliveryPostalCode", "id", "idempotencyKey", "internalNotes", "notes", "orderNumber", "pricedAt", "requestHash", "shipmentMethod", "sourceCartId", "sourceCartVersion", "status", "submittedAt", "subtotal", "updatedAt") SELECT "approvedById", "companyId", "createdAt", "createdById", "currency", "deliveryAddressId", "deliveryCity", "deliveryCountry", "deliveryDistrict", "deliveryLabel", "deliveryLine1", "deliveryLine2", "deliveryPostalCode", "id", "idempotencyKey", "internalNotes", "notes", "orderNumber", "pricedAt", "requestHash", "shipmentMethod", "sourceCartId", "sourceCartVersion", "status", "submittedAt", "subtotal", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_companyId_status_createdAt_idx" ON "Order"("companyId", "status", "createdAt");
CREATE INDEX "Order_companyId_createdAt_idx" ON "Order"("companyId", "createdAt");
CREATE UNIQUE INDEX "Order_companyId_idempotencyKey_key" ON "Order"("companyId", "idempotencyKey");
CREATE TABLE "new_OrderStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderStatusHistory" ("changedById", "createdAt", "fromStatus", "id", "note", "orderId", "toStatus") SELECT "changedById", "createdAt", "fromStatus", "id", "note", "orderId", "toStatus" FROM "OrderStatusHistory";
DROP TABLE "OrderStatusHistory";
ALTER TABLE "new_OrderStatusHistory" RENAME TO "OrderStatusHistory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrderTransitionCommand_orderId_createdAt_idx" ON "OrderTransitionCommand"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderTransitionCommand_orderId_idempotencyKey_key" ON "OrderTransitionCommand"("orderId", "idempotencyKey");
