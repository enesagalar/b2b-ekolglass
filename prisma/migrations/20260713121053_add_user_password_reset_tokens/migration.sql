-- CreateTable
CREATE TABLE "UserPasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPasswordResetToken_tokenHash_key" ON "UserPasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "UserPasswordResetToken_userId_consumedAt_revokedAt_idx" ON "UserPasswordResetToken"("userId", "consumedAt", "revokedAt");

-- CreateIndex
CREATE INDEX "UserPasswordResetToken_expiresAt_idx" ON "UserPasswordResetToken"("expiresAt");
