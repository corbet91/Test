-- CreateTable
CREATE TABLE "revenue" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "posRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "eatclubRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "directRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "labourCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "covers" INTEGER NOT NULL DEFAULT 0,
    "positiveEvent" TEXT,
    "negativeEvent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "revenue_date_key" ON "revenue"("date");
