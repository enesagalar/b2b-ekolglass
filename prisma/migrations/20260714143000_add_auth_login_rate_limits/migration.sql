CREATE TABLE "AuthLoginFailure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailKey" TEXT NOT NULL,
    "ipKey" TEXT,
    "reason" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuthLoginFailure_emailKey_createdAt_idx"
ON "AuthLoginFailure"("emailKey", "createdAt");

CREATE INDEX "AuthLoginFailure_ipKey_createdAt_idx"
ON "AuthLoginFailure"("ipKey", "createdAt");

CREATE INDEX "AuthLoginFailure_expiresAt_idx"
ON "AuthLoginFailure"("expiresAt");
