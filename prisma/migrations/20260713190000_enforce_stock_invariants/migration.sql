-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'SIMPLIFIED',
    "status" TEXT NOT NULL DEFAULT 'ASK_FOR_AVAILABILITY',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockItem_quantity_nonnegative_check" CHECK ("quantity" >= 0),
    CONSTRAINT "StockItem_reserved_nonnegative_check" CHECK ("reservedQuantity" >= 0),
    CONSTRAINT "StockItem_reserved_within_quantity_check" CHECK ("reservedQuantity" <= "quantity")
);
INSERT INTO "new_StockItem" (
    "id", "productId", "warehouseCode", "quantity", "reservedQuantity",
    "visibility", "status", "updatedAt"
)
SELECT
    "id", "productId", "warehouseCode", "quantity", "reservedQuantity",
    "visibility", "status", "updatedAt"
FROM "StockItem";
DROP TABLE "StockItem";
ALTER TABLE "new_StockItem" RENAME TO "StockItem";
CREATE UNIQUE INDEX "StockItem_productId_warehouseCode_key"
ON "StockItem"("productId", "warehouseCode");

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
    CONSTRAINT "StockReservation_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockReservation_quantity_positive_check" CHECK ("quantity" > 0),
    CONSTRAINT "StockReservation_status_check" CHECK ("status" IN ('ACTIVE', 'RELEASED', 'CONSUMED')),
    CONSTRAINT "StockReservation_lifecycle_check" CHECK (
        ("status" = 'ACTIVE' AND "releasedAt" IS NULL AND "consumedAt" IS NULL AND "releaseReason" IS NULL)
        OR ("status" = 'RELEASED' AND "releasedAt" IS NOT NULL AND "consumedAt" IS NULL)
        OR ("status" = 'CONSUMED' AND "consumedAt" IS NOT NULL AND "releasedAt" IS NULL AND "releaseReason" IS NULL)
    )
);
INSERT INTO "new_StockReservation" (
    "id", "orderItemId", "stockItemId", "quantity", "status", "expiresAt",
    "createdAt", "releasedAt", "consumedAt", "releaseReason", "updatedAt"
)
SELECT
    "id", "orderItemId", "stockItemId", "quantity", "status", "expiresAt",
    "createdAt", "releasedAt", "consumedAt", "releaseReason", "updatedAt"
FROM "StockReservation";
DROP TABLE "StockReservation";
ALTER TABLE "new_StockReservation" RENAME TO "StockReservation";
CREATE UNIQUE INDEX "StockReservation_orderItemId_stockItemId_key"
ON "StockReservation"("orderItemId", "stockItemId");
CREATE INDEX "StockReservation_stockItemId_status_idx"
ON "StockReservation"("stockItemId", "status");
CREATE INDEX "StockReservation_status_expiresAt_idx"
ON "StockReservation"("status", "expiresAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
