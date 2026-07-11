CREATE TABLE "UserActivationToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserActivationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserActivationToken_tokenHash_key" ON "UserActivationToken"("tokenHash");
CREATE INDEX "User_companyId_role_status_idx" ON "User"("companyId", "role", "status");
CREATE INDEX "UserActivationToken_userId_consumedAt_revokedAt_idx" ON "UserActivationToken"("userId", "consumedAt", "revokedAt");
CREATE INDEX "UserActivationToken_expiresAt_idx" ON "UserActivationToken"("expiresAt");
