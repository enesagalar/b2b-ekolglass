CREATE INDEX "DealerApplication_status_createdAt_idx" ON "DealerApplication"("status", "createdAt");
CREATE INDEX "DealerApplication_companyId_idx" ON "DealerApplication"("companyId");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
