/*
  Warnings:

  - Made the column `roundCount` on table `Category` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "currentRound" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "roundCount" SET NOT NULL,
ALTER COLUMN "roundCount" SET DEFAULT 3;
