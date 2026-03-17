-- CreateEnum
CREATE TYPE "PlayStyle" AS ENUM ('SHAKE_ATTACK', 'PEN_ATTACK', 'CUTTER', 'BLOCKER', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "affiliation" TEXT,
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "playStyle" "PlayStyle";
