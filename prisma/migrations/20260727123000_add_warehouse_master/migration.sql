CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addressLine" TEXT,
    "district" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'TR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Warehouse_code_format_check" CHECK (
        length("code") BETWEEN 2 AND 40
        AND "code" = upper(trim("code"))
    )
);

INSERT INTO "Warehouse" (
    "id", "code", "name", "isActive", "createdAt", "updatedAt"
)
SELECT
    'warehouse:' || upper(trim("warehouseCode")),
    upper(trim("warehouseCode")),
    CASE
        WHEN upper(trim("warehouseCode")) = 'MERKEZ' THEN 'Merkez Depo'
        ELSE upper(trim("warehouseCode"))
    END,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "StockItem"
GROUP BY upper(trim("warehouseCode"));

INSERT OR IGNORE INTO "Warehouse" (
    "id", "code", "name", "isActive", "createdAt", "updatedAt"
)
VALUES (
    'warehouse:MERKEZ', 'MERKEZ', 'Merkez Depo', true,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");
CREATE INDEX "Warehouse_isActive_name_idx" ON "Warehouse"("isActive", "name");

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'SIMPLIFIED',
    "status" TEXT NOT NULL DEFAULT 'OUT_OF_STOCK',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockItem_warehouseCode_fkey" FOREIGN KEY ("warehouseCode") REFERENCES "Warehouse" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockItem_quantity_nonnegative_check" CHECK ("quantity" >= 0),
    CONSTRAINT "StockItem_reserved_nonnegative_check" CHECK ("reservedQuantity" >= 0),
    CONSTRAINT "StockItem_reserved_within_quantity_check" CHECK ("reservedQuantity" <= "quantity")
);

INSERT INTO "new_StockItem" (
    "id", "productId", "warehouseCode", "quantity", "reservedQuantity",
    "visibility", "status", "updatedAt"
)
SELECT
    "id", "productId", upper(trim("warehouseCode")), "quantity",
    "reservedQuantity", "visibility", "status", "updatedAt"
FROM "StockItem";

DROP TABLE "StockItem";
ALTER TABLE "new_StockItem" RENAME TO "StockItem";

CREATE UNIQUE INDEX "StockItem_productId_warehouseCode_key"
ON "StockItem"("productId", "warehouseCode");
CREATE INDEX "StockItem_warehouseCode_status_updatedAt_idx"
ON "StockItem"("warehouseCode", "status", "updatedAt");
CREATE INDEX "StockItem_status_updatedAt_idx"
ON "StockItem"("status", "updatedAt");

CREATE TRIGGER "StockItem_derive_status_after_insert"
AFTER INSERT ON "StockItem"
WHEN NEW."status" <> CASE
  WHEN NEW."quantity" <= 0 THEN 'OUT_OF_STOCK'
  WHEN NEW."quantity" - NEW."reservedQuantity" <= 0 THEN 'RESERVED'
  WHEN NEW."quantity" - NEW."reservedQuantity" <= 3 THEN 'LOW_STOCK'
  ELSE 'IN_STOCK'
END
BEGIN
  UPDATE "StockItem"
  SET "status" = CASE
    WHEN NEW."quantity" <= 0 THEN 'OUT_OF_STOCK'
    WHEN NEW."quantity" - NEW."reservedQuantity" <= 0 THEN 'RESERVED'
    WHEN NEW."quantity" - NEW."reservedQuantity" <= 3 THEN 'LOW_STOCK'
    ELSE 'IN_STOCK'
  END
  WHERE "id" = NEW."id";
END;

CREATE TRIGGER "StockItem_derive_status_after_update"
AFTER UPDATE OF "quantity", "reservedQuantity", "status" ON "StockItem"
WHEN NEW."status" <> CASE
  WHEN NEW."quantity" <= 0 THEN 'OUT_OF_STOCK'
  WHEN NEW."quantity" - NEW."reservedQuantity" <= 0 THEN 'RESERVED'
  WHEN NEW."quantity" - NEW."reservedQuantity" <= 3 THEN 'LOW_STOCK'
  ELSE 'IN_STOCK'
END
BEGIN
  UPDATE "StockItem"
  SET "status" = CASE
    WHEN NEW."quantity" <= 0 THEN 'OUT_OF_STOCK'
    WHEN NEW."quantity" - NEW."reservedQuantity" <= 0 THEN 'RESERVED'
    WHEN NEW."quantity" - NEW."reservedQuantity" <= 3 THEN 'LOW_STOCK'
    ELSE 'IN_STOCK'
  END
  WHERE "id" = NEW."id";
END;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
