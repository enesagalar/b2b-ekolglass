ALTER TABLE "CatalogImportRow" ADD COLUMN "previousPrice" DECIMAL;
ALTER TABLE "CatalogImportRow" ADD COLUMN "minQuantity" INTEGER;
ALTER TABLE "CatalogImportRow" ADD COLUMN "expectedPriceUpdatedAt" DATETIME;
