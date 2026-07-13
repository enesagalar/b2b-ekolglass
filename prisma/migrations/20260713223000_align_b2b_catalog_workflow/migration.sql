PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_PriceList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "customerGroupId" TEXT,
    "companyId" TEXT,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceList_customerGroupId_fkey" FOREIGN KEY ("customerGroupId") REFERENCES "CustomerGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PriceList_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PriceList_single_scope_check" CHECK ("customerGroupId" IS NULL OR "companyId" IS NULL),
    CONSTRAINT "PriceList_date_range_check" CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt")
);

INSERT INTO "new_PriceList" SELECT * FROM "PriceList";
DROP TABLE "PriceList";
ALTER TABLE "new_PriceList" RENAME TO "PriceList";

CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "vehicleBrand" TEXT,
    "vehicleModel" TEXT,
    "yearStart" INTEGER,
    "yearEnd" INTEGER,
    "glassPosition" TEXT,
    "glassType" TEXT NOT NULL,
    "dimensions" TEXT,
    "thicknessMm" DECIMAL,
    "tint" TEXT,
    "isTempered" BOOLEAN NOT NULL DEFAULT false,
    "isLaminated" BOOLEAN NOT NULL DEFAULT false,
    "processingNotes" TEXT,
    "compatibilityNotes" TEXT,
    "isCustomAvailable" BOOLEAN NOT NULL DEFAULT false,
    "orderMode" TEXT NOT NULL DEFAULT 'ORDER_ONLY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Product"
SELECT
    "id", "code", "name", "categoryId", "vehicleBrand", "vehicleModel",
    "yearStart", "yearEnd", "glassPosition", "glassType", "dimensions",
    "thicknessMm", "tint", "isTempered", "isLaminated", "processingNotes",
    "compatibilityNotes", "isCustomAvailable", 'ORDER_ONLY',
    CASE WHEN "orderMode" = 'QUOTE_ONLY' THEN 'DRAFT' ELSE "status" END,
    "createdAt", "updatedAt"
FROM "Product";

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
CREATE INDEX "Product_code_idx" ON "Product"("code");
CREATE INDEX "Product_vehicleBrand_vehicleModel_idx" ON "Product"("vehicleBrand", "vehicleModel");
CREATE INDEX "Product_glassType_idx" ON "Product"("glassType");

ALTER TABLE "MediaAsset" ADD COLUMN "objectKey" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "byteSize" INTEGER;
ALTER TABLE "MediaAsset" ADD COLUMN "checksum" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "storageProvider" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "uploadedByUserId" TEXT;
CREATE UNIQUE INDEX "MediaAsset_objectKey_key" ON "MediaAsset"("objectKey");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
