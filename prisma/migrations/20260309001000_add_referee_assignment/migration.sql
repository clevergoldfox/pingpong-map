-- CreateTable
CREATE TABLE "MatchRefereeAssignment" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchRefereeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchRefereeAssignment_matchId_key" ON "MatchRefereeAssignment"("matchId");

-- CreateIndex
CREATE INDEX "MatchRefereeAssignment_userId_idx" ON "MatchRefereeAssignment"("userId");

-- AddForeignKey
ALTER TABLE "MatchRefereeAssignment" ADD CONSTRAINT "MatchRefereeAssignment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRefereeAssignment" ADD CONSTRAINT "MatchRefereeAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

