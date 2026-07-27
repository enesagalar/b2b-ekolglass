CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "sourceWarehouseCode" TEXT NOT NULL,
    "destinationWarehouseCode" TEXT NOT NULL,
    "sourceStockItemId" TEXT NOT NULL,
    "destinationStockItemId" TEXT NOT NULL,
    "sourceMovementId" TEXT NOT NULL,
    "destinationMovementId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_sourceWarehouseCode_fkey" FOREIGN KEY ("sourceWarehouseCode") REFERENCES "Warehouse" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_destinationWarehouseCode_fkey" FOREIGN KEY ("destinationWarehouseCode") REFERENCES "Warehouse" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_sourceStockItemId_fkey" FOREIGN KEY ("sourceStockItemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_destinationStockItemId_fkey" FOREIGN KEY ("destinationStockItemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_sourceMovementId_fkey" FOREIGN KEY ("sourceMovementId") REFERENCES "StockMovement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_destinationMovementId_fkey" FOREIGN KEY ("destinationMovementId") REFERENCES "StockMovement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockTransfer_positive_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "StockTransfer_distinct_warehouses_check" CHECK ("sourceWarehouseCode" <> "destinationWarehouseCode"),
    CONSTRAINT "StockTransfer_required_fields_check" CHECK (
        trim("transferNumber") <> ''
        AND trim("productCode") <> ''
        AND trim("reason") <> ''
        AND trim("idempotencyKey") <> ''
        AND trim("payloadHash") <> ''
    )
);

CREATE UNIQUE INDEX "StockTransfer_transferNumber_key" ON "StockTransfer"("transferNumber");
CREATE UNIQUE INDEX "StockTransfer_idempotencyKey_key" ON "StockTransfer"("idempotencyKey");
CREATE UNIQUE INDEX "StockTransfer_sourceMovementId_key" ON "StockTransfer"("sourceMovementId");
CREATE UNIQUE INDEX "StockTransfer_destinationMovementId_key" ON "StockTransfer"("destinationMovementId");
CREATE INDEX "StockTransfer_productId_createdAt_idx" ON "StockTransfer"("productId", "createdAt");
CREATE INDEX "StockTransfer_sourceWarehouseCode_createdAt_idx" ON "StockTransfer"("sourceWarehouseCode", "createdAt");
CREATE INDEX "StockTransfer_destinationWarehouseCode_createdAt_idx" ON "StockTransfer"("destinationWarehouseCode", "createdAt");
CREATE INDEX "StockTransfer_actorUserId_createdAt_idx" ON "StockTransfer"("actorUserId", "createdAt");
CREATE INDEX "StockTransfer_sourceStockItemId_createdAt_idx" ON "StockTransfer"("sourceStockItemId", "createdAt");
CREATE INDEX "StockTransfer_destinationStockItemId_createdAt_idx" ON "StockTransfer"("destinationStockItemId", "createdAt");

CREATE TRIGGER "StockTransfer_append_only_update"
BEFORE UPDATE ON "StockTransfer"
BEGIN
    SELECT RAISE(ABORT, 'StockTransfer is append-only');
END;

CREATE TRIGGER "StockTransfer_append_only_delete"
BEFORE DELETE ON "StockTransfer"
BEGIN
    SELECT RAISE(ABORT, 'StockTransfer is append-only');
END;

DROP TRIGGER "StockMovement_required_fields_insert";

CREATE TRIGGER "StockMovement_required_fields_insert"
BEFORE INSERT ON "StockMovement"
WHEN NEW."reason" IS NULL
  OR trim(NEW."reason") = ''
  OR trim(NEW."sourceType") = ''
  OR trim(NEW."sourceId") = ''
  OR trim(NEW."idempotencyKey") = ''
  OR trim(NEW."payloadHash") = ''
  OR NEW."sequence" < 1
  OR NEW."movementType" NOT IN (
    'OPENING_BALANCE',
    'INITIAL_STOCK',
    'MANUAL_ADJUSTMENT',
    'CSV_IMPORT',
    'ORDER_RESERVATION',
    'ORDER_RELEASE',
    'ORDER_CONSUME',
    'TRANSFER_OUT',
    'TRANSFER_IN'
  )
BEGIN
    SELECT RAISE(ABORT, 'StockMovement required fields are invalid');
END;
