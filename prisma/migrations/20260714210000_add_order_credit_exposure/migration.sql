ALTER TABLE "Company" ADD COLUMN "creditPolicy" TEXT NOT NULL DEFAULT 'UNSET';

UPDATE "Company"
SET "creditPolicy" = 'LIMITED'
WHERE "creditLimit" IS NOT NULL;

ALTER TABLE "Order" ADD COLUMN "paymentTermsSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN "creditPolicySnapshot" TEXT NOT NULL DEFAULT 'UNSET';
ALTER TABLE "Order" ADD COLUMN "creditLimitSnapshot" DECIMAL;
ALTER TABLE "Order" ADD COLUMN "creditExposureBefore" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "creditExposureAfter" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "commercialReviewRequired" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Order" ADD COLUMN "commercialOverrideReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "commercialOverrideById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD COLUMN "commercialOverrideAt" DATETIME;

CREATE INDEX "Order_companyId_commercialReviewRequired_status_idx"
ON "Order"("companyId", "commercialReviewRequired", "status");

CREATE TRIGGER "Company_credit_policy_insert_guard"
BEFORE INSERT ON "Company"
FOR EACH ROW
WHEN NEW."creditPolicy" NOT IN ('UNSET', 'LIMITED', 'UNLIMITED')
  OR NEW."creditLimit" < 0
BEGIN
  SELECT RAISE(ABORT, 'invalid company credit policy');
END;

CREATE TRIGGER "Company_credit_policy_update_guard"
BEFORE UPDATE OF "creditPolicy", "creditLimit" ON "Company"
FOR EACH ROW
WHEN NEW."creditPolicy" NOT IN ('UNSET', 'LIMITED', 'UNLIMITED')
  OR NEW."creditLimit" < 0
BEGIN
  SELECT RAISE(ABORT, 'invalid company credit policy');
END;
