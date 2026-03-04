-- CreateTable
CREATE TABLE "TierHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldTier" "Tier" NOT NULL,
    "newTier" "Tier" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TierHistory_pkey" PRIMARY KEY ("id")
);
