CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "physicalDelta" INTEGER NOT NULL,
    "reservedDelta" INTEGER NOT NULL,
    "beforeQuantity" INTEGER NOT NULL,
    "afterQuantity" INTEGER NOT NULL,
    "beforeReservedQuantity" INTEGER NOT NULL,
    "afterReservedQuantity" INTEGER NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_physical_equation_check" CHECK ("afterQuantity" = "beforeQuantity" + "physicalDelta"),
    CONSTRAINT "StockMovement_reserved_equation_check" CHECK ("afterReservedQuantity" = "beforeReservedQuantity" + "reservedDelta"),
    CONSTRAINT "StockMovement_nonnegative_balance_check" CHECK ("beforeQuantity" >= 0 AND "afterQuantity" >= 0 AND "beforeReservedQuantity" >= 0 AND "afterReservedQuantity" >= 0),
    CONSTRAINT "StockMovement_reserved_within_quantity_check" CHECK ("beforeReservedQuantity" <= "beforeQuantity" AND "afterReservedQuantity" <= "afterQuantity")
);

CREATE UNIQUE INDEX "StockMovement_idempotencyKey_key" ON "StockMovement"("idempotencyKey");
CREATE INDEX "StockMovement_productId_warehouseCode_createdAt_idx" ON "StockMovement"("productId", "warehouseCode", "createdAt");
CREATE INDEX "StockMovement_movementType_createdAt_idx" ON "StockMovement"("movementType", "createdAt");
CREATE INDEX "StockMovement_sourceType_sourceId_createdAt_idx" ON "StockMovement"("sourceType", "sourceId", "createdAt");
CREATE INDEX "StockMovement_stockItemId_createdAt_idx" ON "StockMovement"("stockItemId", "createdAt");

INSERT INTO "StockMovement" (
    "id", "stockItemId", "productId", "productCode", "warehouseCode",
    "movementType", "physicalDelta", "reservedDelta", "beforeQuantity",
    "afterQuantity", "beforeReservedQuantity", "afterReservedQuantity",
    "actorUserId", "reason", "sourceType", "sourceId", "idempotencyKey", "metadata", "createdAt"
)
SELECT
    'opening-' || s."id", s."id", s."productId", p."code", s."warehouseCode",
    'OPENING_BALANCE', s."quantity", s."reservedQuantity", 0,
    s."quantity", 0, s."reservedQuantity",
    NULL, 'Stok hareket defteri acilis bakiyesi.', 'MIGRATION',
    '20260721090000_add_stock_movement_ledger', 'opening:' || s."id", NULL, CURRENT_TIMESTAMP
FROM "StockItem" s
JOIN "Product" p ON p."id" = s."productId";

CREATE TRIGGER "StockMovement_append_only_update"
BEFORE UPDATE ON "StockMovement"
BEGIN
    SELECT RAISE(ABORT, 'StockMovement is append-only');
END;

CREATE TRIGGER "StockMovement_append_only_delete"
BEFORE DELETE ON "StockMovement"
BEGIN
    SELECT RAISE(ABORT, 'StockMovement is append-only');
END;
