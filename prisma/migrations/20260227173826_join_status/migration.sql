-- CreateEnum
CREATE TYPE "JoinStatus" AS ENUM ('APPLIED', 'PAID', 'CANCELED', 'FORFEITED');

-- AlterTable
ALTER TABLE "TournamentParticipant" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "joinStatus" "JoinStatus" NOT NULL DEFAULT 'APPLIED',
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
