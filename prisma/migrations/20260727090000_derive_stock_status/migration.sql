UPDATE "StockItem"
SET "status" = CASE
  WHEN "quantity" <= 0 THEN 'OUT_OF_STOCK'
  WHEN "quantity" - "reservedQuantity" <= 0 THEN 'RESERVED'
  WHEN "quantity" - "reservedQuantity" <= 3 THEN 'LOW_STOCK'
  ELSE 'IN_STOCK'
END;

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
