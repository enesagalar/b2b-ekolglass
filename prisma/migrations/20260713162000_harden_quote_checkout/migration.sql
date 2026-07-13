-- DropIndex
DROP INDEX "QuoteRequest_idempotencyKey_key";

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN "requestHash" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN "sourceCartId" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN "sourceCartVersion" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuoteCart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteCart_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuoteCart_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_QuoteCart" ("companyId", "createdAt", "id", "ownerUserId", "updatedAt") SELECT "companyId", "createdAt", "id", "ownerUserId", "updatedAt" FROM "QuoteCart";
DROP TABLE "QuoteCart";
ALTER TABLE "new_QuoteCart" RENAME TO "QuoteCart";
CREATE INDEX "QuoteCart_ownerUserId_idx" ON "QuoteCart"("ownerUserId");
CREATE UNIQUE INDEX "QuoteCart_companyId_ownerUserId_key" ON "QuoteCart"("companyId", "ownerUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_companyId_idempotencyKey_key" ON "QuoteRequest"("companyId", "idempotencyKey");
