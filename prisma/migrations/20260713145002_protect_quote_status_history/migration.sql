-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuoteStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteStatusHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "QuoteRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuoteStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuoteStatusHistory" ("changedById", "createdAt", "fromStatus", "id", "note", "quoteId", "toStatus") SELECT "changedById", "createdAt", "fromStatus", "id", "note", "quoteId", "toStatus" FROM "QuoteStatusHistory";
DROP TABLE "QuoteStatusHistory";
ALTER TABLE "new_QuoteStatusHistory" RENAME TO "QuoteStatusHistory";
CREATE INDEX "QuoteStatusHistory_quoteId_createdAt_idx" ON "QuoteStatusHistory"("quoteId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
