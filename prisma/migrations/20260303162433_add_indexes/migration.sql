-- CreateIndex
CREATE INDEX "Match_categoryId_roundNumber_idx" ON "Match"("categoryId", "roundNumber");

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "RatingHistory_userId_idx" ON "RatingHistory"("userId");

-- CreateIndex
CREATE INDEX "RatingHistory_matchId_idx" ON "RatingHistory"("matchId");

-- CreateIndex
CREATE INDEX "RatingHistory_createdAt_idx" ON "RatingHistory"("createdAt");

-- CreateIndex
CREATE INDEX "User_rating_idx" ON "User"("rating");
