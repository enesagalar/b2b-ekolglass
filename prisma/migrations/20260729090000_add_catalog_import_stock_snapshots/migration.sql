ALTER TABLE "CatalogImportRow" ADD COLUMN "previousStockQuantity" INTEGER;
ALTER TABLE "CatalogImportRow" ADD COLUMN "previousStockReserved" INTEGER;
ALTER TABLE "CatalogImportRow" ADD COLUMN "previousStockVisibility" TEXT;
ALTER TABLE "CatalogImportRow" ADD COLUMN "expectedStockUpdatedAt" DATETIME;
