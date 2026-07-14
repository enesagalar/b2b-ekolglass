CREATE TABLE "CatalogImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'PRICE_STOCK',
    "status" TEXT NOT NULL DEFAULT 'PREVIEW',
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "validRows" INTEGER NOT NULL,
    "invalidRows" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "appliedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CatalogImportBatch_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CatalogImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CatalogImportRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "productId" TEXT,
    "productCode" TEXT NOT NULL,
    "netPrice" DECIMAL,
    "warehouseCode" TEXT,
    "stockQuantity" INTEGER,
    "stockVisibility" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatalogImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CatalogImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CatalogImportRow_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CatalogImportBatch_createdById_status_createdAt_idx" ON "CatalogImportBatch"("createdById", "status", "createdAt");
CREATE INDEX "CatalogImportBatch_expiresAt_status_idx" ON "CatalogImportBatch"("expiresAt", "status");
CREATE INDEX "CatalogImportRow_batchId_status_rowNumber_idx" ON "CatalogImportRow"("batchId", "status", "rowNumber");
CREATE INDEX "CatalogImportRow_productId_idx" ON "CatalogImportRow"("productId");
CREATE UNIQUE INDEX "CatalogImportRow_batchId_rowNumber_key" ON "CatalogImportRow"("batchId", "rowNumber");
