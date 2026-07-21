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
    'ORDER_CONSUME'
  )
BEGIN
    SELECT RAISE(ABORT, 'StockMovement required fields are invalid');
END;
