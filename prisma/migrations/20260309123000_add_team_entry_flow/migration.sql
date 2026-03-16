-- Phase 3: Team entry (representative + invitations)

-- Add team size config to Category
ALTER TABLE "Category"
ADD COLUMN "teamMinMembers" INTEGER,
ADD COLUMN "teamMaxMembers" INTEGER;

-- Enums
CREATE TYPE "TeamEntryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED');
CREATE TYPE "TeamEntryMemberStatus" AS ENUM ('INVITED', 'APPROVED', 'REJECTED');

-- TeamEntry
CREATE TABLE "TeamEntry" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "teamName" TEXT NOT NULL,
  "representativeUserId" TEXT NOT NULL,
  "status" "TeamEntryStatus" NOT NULL DEFAULT 'PENDING',
  "confirmedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamEntryMember" (
  "id" TEXT NOT NULL,
  "teamEntryId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "TeamEntryMemberStatus" NOT NULL DEFAULT 'INVITED',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),

  CONSTRAINT "TeamEntryMember_pkey" PRIMARY KEY ("id")
);

-- Indexes / uniques
CREATE INDEX "TeamEntry_tournamentId_idx" ON "TeamEntry"("tournamentId");
CREATE INDEX "TeamEntry_categoryId_idx" ON "TeamEntry"("categoryId");
CREATE INDEX "TeamEntry_representativeUserId_idx" ON "TeamEntry"("representativeUserId");
CREATE UNIQUE INDEX "TeamEntry_categoryId_representativeUserId_key" ON "TeamEntry"("categoryId","representativeUserId");

CREATE INDEX "TeamEntryMember_userId_idx" ON "TeamEntryMember"("userId");
CREATE INDEX "TeamEntryMember_teamEntryId_idx" ON "TeamEntryMember"("teamEntryId");
CREATE UNIQUE INDEX "TeamEntryMember_teamEntryId_userId_key" ON "TeamEntryMember"("teamEntryId","userId");

-- FKs
ALTER TABLE "TeamEntry" ADD CONSTRAINT "TeamEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamEntry" ADD CONSTRAINT "TeamEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamEntry" ADD CONSTRAINT "TeamEntry_representativeUserId_fkey" FOREIGN KEY ("representativeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamEntryMember" ADD CONSTRAINT "TeamEntryMember_teamEntryId_fkey" FOREIGN KEY ("teamEntryId") REFERENCES "TeamEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamEntryMember" ADD CONSTRAINT "TeamEntryMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

