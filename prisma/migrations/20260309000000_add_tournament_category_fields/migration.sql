-- AlterTable Tournament: 大会要項（ステップ②）
ALTER TABLE "Tournament" ADD COLUMN "mapUrl" TEXT;
ALTER TABLE "Tournament" ADD COLUMN "openAt" TIMESTAMP(3);
ALTER TABLE "Tournament" ADD COLUMN "entryDeadlineAt" TIMESTAMP(3);
ALTER TABLE "Tournament" ADD COLUMN "cancelPolicy" TEXT;
ALTER TABLE "Tournament" ADD COLUMN "organizer" TEXT;
ALTER TABLE "Tournament" ADD COLUMN "sponsor" TEXT;
ALTER TABLE "Tournament" ADD COLUMN "description" TEXT;

-- CreateEnum CategoryGender
CREATE TYPE "CategoryGender" AS ENUM ('MALE', 'FEMALE', 'MIXED', 'MIX');

-- CreateEnum LeagueMode
CREATE TYPE "LeagueMode" AS ENUM ('FULL', 'SELECT');

-- AlterTable Category: 種目詳細（ステップ③）
ALTER TABLE "Category" ADD COLUMN "gender" "CategoryGender";
ALTER TABLE "Category" ADD COLUMN "teamMatchStructure" JSONB;
ALTER TABLE "Category" ADD COLUMN "leagueMode" "LeagueMode";
ALTER TABLE "Category" ADD COLUMN "fullLeaguePlayerCount" INTEGER;
ALTER TABLE "Category" ADD COLUMN "selectLeagueMatchCount" INTEGER;
ALTER TABLE "Category" ADD COLUMN "capacity" INTEGER;
ALTER TABLE "Category" ADD COLUMN "minEntries" INTEGER;
ALTER TABLE "Category" ADD COLUMN "courtRange" TEXT;
ALTER TABLE "Category" ADD COLUMN "ageRestriction" JSONB;
ALTER TABLE "Category" ADD COLUMN "ratingRestriction" JSONB;
ALTER TABLE "Category" ADD COLUMN "refereeRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN "entryFeeCard" INTEGER;
ALTER TABLE "Category" ADD COLUMN "entryFeeCash" INTEGER;
