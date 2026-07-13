CREATE TRIGGER "Company_discountRate_insert_check"
BEFORE INSERT ON "Company"
FOR EACH ROW
WHEN NEW."discountRate" < 0 OR NEW."discountRate" > 100
BEGIN
  SELECT RAISE(ABORT, 'Company discountRate must be between 0 and 100');
END;

CREATE TRIGGER "Company_discountRate_update_check"
BEFORE UPDATE OF "discountRate" ON "Company"
FOR EACH ROW
WHEN NEW."discountRate" < 0 OR NEW."discountRate" > 100
BEGIN
  SELECT RAISE(ABORT, 'Company discountRate must be between 0 and 100');
END;
