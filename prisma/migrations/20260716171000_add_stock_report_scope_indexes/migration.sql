CREATE INDEX "StockItem_status_updatedAt_idx"
ON "StockItem"("status", "updatedAt");

CREATE INDEX "Product_status_code_idx"
ON "Product"("status", "code");
