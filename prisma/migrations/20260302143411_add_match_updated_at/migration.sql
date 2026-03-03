/*
  Warnings:

  - Added the required column `updatedAt` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('NONE', 'IN_PROGRESS', 'LOCKED');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "resultStatus" "ResultStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "scoreJson" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MatchScoreSubmission" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "scoreJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchScoreSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchScoreSubmission_matchId_submittedById_key" ON "MatchScoreSubmission"("matchId", "submittedById");

-- CreateIndex
CREATE UNIQUE INDEX "MatchScoreSubmission_matchId_clientRequestId_key" ON "MatchScoreSubmission"("matchId", "clientRequestId");

-- AddForeignKey
ALTER TABLE "MatchScoreSubmission" ADD CONSTRAINT "MatchScoreSubmission_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
