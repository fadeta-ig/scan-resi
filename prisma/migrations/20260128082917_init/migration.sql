-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resiNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAREHOUSE',
    "scannedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Package_resiNumber_key" ON "Package"("resiNumber");
