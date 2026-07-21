ALTER TABLE "StockMovement" ADD COLUMN "sequence" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "StockMovement" ADD COLUMN "payloadHash" TEXT NOT NULL DEFAULT '';

DROP TRIGGER "StockMovement_append_only_update";

CREATE UNIQUE INDEX "StockMovement_stockItemId_sequence_key" ON "StockMovement"("stockItemId", "sequence");

CREATE TRIGGER "StockMovement_required_fields_insert"
BEFORE INSERT ON "StockMovement"
WHEN trim(NEW."reason") = '' OR trim(NEW."sourceType") = '' OR trim(NEW."sourceId") = '' OR trim(NEW."idempotencyKey") = '' OR trim(NEW."payloadHash") = ''
BEGIN
    SELECT RAISE(ABORT, 'StockMovement required fields are empty');
END;

CREATE TRIGGER "StockMovement_sequence_insert"
BEFORE INSERT ON "StockMovement"
WHEN NEW."sequence" != COALESCE((SELECT MAX("sequence") + 1 FROM "StockMovement" WHERE "stockItemId" = NEW."stockItemId"), 1)
BEGIN
    SELECT RAISE(ABORT, 'StockMovement sequence is invalid');
END;

CREATE TRIGGER "StockMovement_balance_chain_insert"
BEFORE INSERT ON "StockMovement"
WHEN EXISTS (SELECT 1 FROM "StockMovement" WHERE "stockItemId" = NEW."stockItemId")
 AND (
    NEW."beforeQuantity" != (SELECT "afterQuantity" FROM "StockMovement" WHERE "stockItemId" = NEW."stockItemId" ORDER BY "sequence" DESC LIMIT 1)
    OR NEW."beforeReservedQuantity" != (SELECT "afterReservedQuantity" FROM "StockMovement" WHERE "stockItemId" = NEW."stockItemId" ORDER BY "sequence" DESC LIMIT 1)
 )
BEGIN
    SELECT RAISE(ABORT, 'StockMovement balance chain is invalid');
END;

UPDATE "StockMovement"
SET "payloadHash" = lower(hex(randomblob(32)))
WHERE "payloadHash" = '';

CREATE TRIGGER "StockMovement_append_only_update"
BEFORE UPDATE ON "StockMovement"
BEGIN
    SELECT RAISE(ABORT, 'StockMovement is append-only');
END;
