CREATE INDEX "Order_currency_submittedAt_status_idx"
ON "Order"("currency", "submittedAt", "status");

CREATE INDEX "OrderStatusHistory_toStatus_createdAt_orderId_idx"
ON "OrderStatusHistory"("toStatus", "createdAt", "orderId");

CREATE INDEX "Shipment_deliveredAt_status_idx"
ON "Shipment"("deliveredAt", "status");
