-- CreateTable
CREATE TABLE "RateCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "monthly_minimum_cents" INTEGER NOT NULL,
    "prices" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rateCardId" TEXT NOT NULL,
    "rateCardVer" TEXT NOT NULL,
    "totals" JSONB NOT NULL,
    CONSTRAINT "Quote_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL
);

-- CreateIndex
CREATE INDEX "Quote_rateCardId_idx" ON "Quote"("rateCardId");
