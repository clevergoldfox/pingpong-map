import { TournamentStatus } from "@prisma/client"

export function canStartTournament(status: TournamentStatus) {
  return status === "CHECKIN"
}

export function canEditTournament(status: TournamentStatus) {
  return status === "DRAFT" || status === "PUBLISHED"
}