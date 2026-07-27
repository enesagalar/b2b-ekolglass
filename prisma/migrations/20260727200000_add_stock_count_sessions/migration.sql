CREATE TABLE "StockCountSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countNumber" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "expectedQuantity" INTEGER NOT NULL,
    "expectedReservedQuantity" INTEGER NOT NULL,
    "expectedStockUpdatedAt" DATETIME NOT NULL,
    "expectedMovementSequence" INTEGER NOT NULL,
    "countedQuantity" INTEGER,
    "differenceQuantity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT NOT NULL,
    "submittedById" TEXT,
    "cancelledById" TEXT,
    "movementId" TEXT,
    "openIdempotencyKey" TEXT NOT NULL,
    "openPayloadHash" TEXT NOT NULL,
    "submissionIdempotencyKey" TEXT,
    "submissionPayloadHash" TEXT,
    "cancellationIdempotencyKey" TEXT,
    "cancellationPayloadHash" TEXT,
    "submissionReason" TEXT,
    "staleCode" TEXT,
    "cancellationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "cancelledAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockCountSession_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockCountSession_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockCountSession_warehouseCode_fkey" FOREIGN KEY ("warehouseCode") REFERENCES "Warehouse" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockCountSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockCountSession_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockCountSession_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockCountSession_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "StockMovement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockCountSession_snapshot_check" CHECK (
        "expectedQuantity" >= 0
        AND "expectedReservedQuantity" >= 0
        AND "expectedReservedQuantity" <= "expectedQuantity"
        AND "expectedMovementSequence" >= 0
        AND ("countedQuantity" IS NULL OR "countedQuantity" >= 0)
        AND (
            "countedQuantity" IS NULL
            OR "differenceQuantity" = "countedQuantity" - "expectedQuantity"
        )
    ),
    CONSTRAINT "StockCountSession_required_fields_check" CHECK (
        trim("countNumber") <> ''
        AND trim("productCode") <> ''
        AND trim("openIdempotencyKey") <> ''
        AND trim("openPayloadHash") <> ''
    ),
    CONSTRAINT "StockCountSession_lifecycle_check" CHECK (
        (
            "status" = 'OPEN'
            AND "countedQuantity" IS NULL
            AND "differenceQuantity" IS NULL
            AND "submittedById" IS NULL
            AND "cancelledById" IS NULL
            AND "movementId" IS NULL
            AND "submissionIdempotencyKey" IS NULL
            AND "submissionPayloadHash" IS NULL
            AND "cancellationIdempotencyKey" IS NULL
            AND "cancellationPayloadHash" IS NULL
            AND "submissionReason" IS NULL
            AND "staleCode" IS NULL
            AND "cancellationReason" IS NULL
            AND "submittedAt" IS NULL
            AND "cancelledAt" IS NULL
        )
        OR (
            "status" = 'APPLIED'
            AND "countedQuantity" IS NOT NULL
            AND "differenceQuantity" IS NOT NULL
            AND "submittedById" IS NOT NULL
            AND "cancelledById" IS NULL
            AND "submissionIdempotencyKey" IS NOT NULL
            AND "submissionPayloadHash" IS NOT NULL
            AND "submissionReason" IS NOT NULL
            AND trim("submissionIdempotencyKey") <> ''
            AND trim("submissionPayloadHash") <> ''
            AND trim("submissionReason") <> ''
            AND "staleCode" IS NULL
            AND "cancellationIdempotencyKey" IS NULL
            AND "cancellationPayloadHash" IS NULL
            AND "cancellationReason" IS NULL
            AND "submittedAt" IS NOT NULL
            AND "cancelledAt" IS NULL
            AND "movementId" IS NOT NULL
        )
        OR (
            "status" = 'STALE'
            AND "countedQuantity" IS NOT NULL
            AND "differenceQuantity" IS NOT NULL
            AND "submittedById" IS NOT NULL
            AND "cancelledById" IS NULL
            AND "movementId" IS NULL
            AND "submissionIdempotencyKey" IS NOT NULL
            AND "submissionPayloadHash" IS NOT NULL
            AND "submissionReason" IS NOT NULL
            AND "staleCode" IS NOT NULL
            AND trim("submissionIdempotencyKey") <> ''
            AND trim("submissionPayloadHash") <> ''
            AND trim("submissionReason") <> ''
            AND trim("staleCode") <> ''
            AND "cancellationIdempotencyKey" IS NULL
            AND "cancellationPayloadHash" IS NULL
            AND "cancellationReason" IS NULL
            AND "submittedAt" IS NOT NULL
            AND "cancelledAt" IS NULL
        )
        OR (
            "status" = 'CANCELLED'
            AND "countedQuantity" IS NULL
            AND "differenceQuantity" IS NULL
            AND "submittedById" IS NULL
            AND "cancelledById" IS NOT NULL
            AND "movementId" IS NULL
            AND "submissionIdempotencyKey" IS NULL
            AND "submissionPayloadHash" IS NULL
            AND "submissionReason" IS NULL
            AND "staleCode" IS NULL
            AND "cancellationIdempotencyKey" IS NOT NULL
            AND "cancellationPayloadHash" IS NOT NULL
            AND "cancellationReason" IS NOT NULL
            AND trim("cancellationIdempotencyKey") <> ''
            AND trim("cancellationPayloadHash") <> ''
            AND trim("cancellationReason") <> ''
            AND "submittedAt" IS NULL
            AND "cancelledAt" IS NOT NULL
        )
    )
);

CREATE UNIQUE INDEX "StockCountSession_countNumber_key" ON "StockCountSession"("countNumber");
CREATE UNIQUE INDEX "StockCountSession_movementId_key" ON "StockCountSession"("movementId");
CREATE UNIQUE INDEX "StockCountSession_openIdempotencyKey_key" ON "StockCountSession"("openIdempotencyKey");
CREATE UNIQUE INDEX "StockCountSession_submissionIdempotencyKey_key" ON "StockCountSession"("submissionIdempotencyKey");
CREATE UNIQUE INDEX "StockCountSession_cancellationIdempotencyKey_key" ON "StockCountSession"("cancellationIdempotencyKey");
CREATE UNIQUE INDEX "StockCountSession_one_open_per_stock_item" ON "StockCountSession"("stockItemId") WHERE "status" = 'OPEN';
CREATE INDEX "StockCountSession_status_createdAt_idx" ON "StockCountSession"("status", "createdAt");
CREATE INDEX "StockCountSession_stockItemId_createdAt_idx" ON "StockCountSession"("stockItemId", "createdAt");
CREATE INDEX "StockCountSession_productId_createdAt_idx" ON "StockCountSession"("productId", "createdAt");
CREATE INDEX "StockCountSession_warehouseCode_createdAt_idx" ON "StockCountSession"("warehouseCode", "createdAt");
CREATE INDEX "StockCountSession_openedById_createdAt_idx" ON "StockCountSession"("openedById", "createdAt");

CREATE TRIGGER "StockCountSession_lifecycle_update"
BEFORE UPDATE ON "StockCountSession"
WHEN OLD."status" <> 'OPEN'
  OR NEW."status" NOT IN ('APPLIED', 'STALE', 'CANCELLED')
  OR NEW."id" <> OLD."id"
  OR NEW."countNumber" <> OLD."countNumber"
  OR NEW."stockItemId" <> OLD."stockItemId"
  OR NEW."productId" <> OLD."productId"
  OR NEW."productCode" <> OLD."productCode"
  OR NEW."warehouseCode" <> OLD."warehouseCode"
  OR NEW."expectedQuantity" <> OLD."expectedQuantity"
  OR NEW."expectedReservedQuantity" <> OLD."expectedReservedQuantity"
  OR NEW."expectedStockUpdatedAt" <> OLD."expectedStockUpdatedAt"
  OR NEW."expectedMovementSequence" <> OLD."expectedMovementSequence"
  OR NEW."openedById" <> OLD."openedById"
  OR NEW."openIdempotencyKey" <> OLD."openIdempotencyKey"
  OR NEW."openPayloadHash" <> OLD."openPayloadHash"
  OR NEW."createdAt" <> OLD."createdAt"
BEGIN
    SELECT RAISE(ABORT, 'StockCountSession lifecycle is immutable');
END;

CREATE TRIGGER "StockCountSession_append_only_delete"
BEFORE DELETE ON "StockCountSession"
BEGIN
    SELECT RAISE(ABORT, 'StockCountSession is append-only');
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
    'TRANSFER_IN',
    'INVENTORY_COUNT'
  )
BEGIN
    SELECT RAISE(ABORT, 'StockMovement required fields are invalid');
END;
