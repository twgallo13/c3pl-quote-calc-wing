-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RateCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "version_notes" TEXT,
    "monthly_minimum_cents" INTEGER NOT NULL,
    "prices" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_RateCard" ("id", "monthly_minimum_cents", "name", "prices", "version") SELECT "id", "monthly_minimum_cents", "name", "prices", "version" FROM "RateCard";
DROP TABLE "RateCard";
ALTER TABLE "new_RateCard" RENAME TO "RateCard";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
