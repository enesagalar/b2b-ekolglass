CREATE INDEX "Address_companyId_isDefault_idx" ON "Address"("companyId", "isDefault");

CREATE INDEX "QuoteRequest_companyId_status_createdAt_idx" ON "QuoteRequest"("companyId", "status", "createdAt");
CREATE INDEX "QuoteRequest_companyId_createdAt_idx" ON "QuoteRequest"("companyId", "createdAt");
CREATE INDEX "QuoteRequestItem_quoteRequestId_idx" ON "QuoteRequestItem"("quoteRequestId");

CREATE INDEX "Order_companyId_status_createdAt_idx" ON "Order"("companyId", "status", "createdAt");
CREATE INDEX "Order_companyId_createdAt_idx" ON "Order"("companyId", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

CREATE INDEX "Shipment_status_updatedAt_idx" ON "Shipment"("status", "updatedAt");
