-- Phase 2: 団体戦 (Team, TeamMember, TeamMatch, TeamMatchGame)

CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMatch" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "winnerTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMatchGame" (
    "id" TEXT NOT NULL,
    "teamMatchId" TEXT NOT NULL,
    "slotOrder" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "player1Id" TEXT,
    "player2Id" TEXT,
    "player1aId" TEXT,
    "player1bId" TEXT,
    "player2aId" TEXT,
    "player2bId" TEXT,
    "winnerId" TEXT,
    "winnerSide" INTEGER,
    "scoreJson" JSONB,
    "resultStatus" "ResultStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMatchGame_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Team_categoryId_idx" ON "Team"("categoryId");

CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

CREATE INDEX "TeamMatch_categoryId_idx" ON "TeamMatch"("categoryId");
CREATE INDEX "TeamMatch_teamAId_teamBId_idx" ON "TeamMatch"("teamAId", "teamBId");

CREATE INDEX "TeamMatchGame_teamMatchId_idx" ON "TeamMatchGame"("teamMatchId");

ALTER TABLE "Team" ADD CONSTRAINT "Team_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamMatchGame" ADD CONSTRAINT "TeamMatchGame_teamMatchId_fkey" FOREIGN KEY ("teamMatchId") REFERENCES "TeamMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
