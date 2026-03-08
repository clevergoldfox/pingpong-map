import type { Match } from "@prisma/client"

export type StandingRow = {
  userId: string
  wins: number
  losses: number
  points: number
}

// MVP points rule example:
// WIN = 3, LOSS = 0
export function calculateStandings(matches: Match[]): StandingRow[] {
  const map = new Map<string, StandingRow>()

  const ensure = (userId: string) => {
    if (!map.has(userId)) {
      map.set(userId, { userId, wins: 0, losses: 0, points: 0 })
    }
    return map.get(userId)!
  }

  for (const m of matches) {
    // only count finished matches (and not forfeits if you want)
    if (m.status !== "FINISHED") continue

    // Safety: ignore broken data
    if (!m.player1Id || !m.player2Id || !m.winnerId) continue

    const p1 = ensure(m.player1Id)
    const p2 = ensure(m.player2Id)

    if (m.winnerId === m.player1Id) {
      p1.wins += 1
      p1.points += 3
      p2.losses += 1
    } else if (m.winnerId === m.player2Id) {
      p2.wins += 1
      p2.points += 3
      p1.losses += 1
    }
  }

  // Sort: points desc → wins desc → losses asc (simple)
  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.losses - b.losses
  })
}