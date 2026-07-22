CREATE TABLE "SecurityRateLimitBucket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "keyType" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "windowStartedAt" DATETIME NOT NULL,
    "attemptCount" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "SecurityRateLimitBucket_scope_keyType_keyHash_key"
ON "SecurityRateLimitBucket"("scope", "keyType", "keyHash");

CREATE INDEX "SecurityRateLimitBucket_expiresAt_idx"
ON "SecurityRateLimitBucket"("expiresAt");

CREATE TABLE "DealerApplicationDeduplication" (
    "emailKey" TEXT NOT NULL PRIMARY KEY,
    "claimToken" TEXT NOT NULL,
    "applicationId" TEXT,
    "acceptedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "DealerApplicationDeduplication_applicationId_key"
ON "DealerApplicationDeduplication"("applicationId");

CREATE INDEX "DealerApplicationDeduplication_expiresAt_idx"
ON "DealerApplicationDeduplication"("expiresAt");

CREATE INDEX "DealerApplication_email_createdAt_idx"
ON "DealerApplication"("email", "createdAt");
