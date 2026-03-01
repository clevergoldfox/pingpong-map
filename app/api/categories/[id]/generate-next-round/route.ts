import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { calculateStandings } from "@/lib/standings"

/**
 * Swiss pairing engine (MVP production-safe)
 */
function generateSwissRound(
  sortedPlayers: string[],
  previousMatches: { player1Id: string; player2Id: string | null }[],
  roundNumber: number
) {
  const matches: {
    player1Id: string
    player2Id: string | null
    roundNumber: number
  }[] = []

  const used = new Set<string>()

  // Precompute played matches for O(1) lookup
  const playedSet = new Set(
    previousMatches
      .filter(m => m.player2Id)
      .map(m => [m.player1Id, m.player2Id].sort().join("_"))
  )

  const hasPlayed = (a: string, b: string) =>
    playedSet.has([a, b].sort().join("_"))

  // Handle BYE if odd number of players
  if (sortedPlayers.length % 2 === 1) {
    const byePlayer = sortedPlayers[sortedPlayers.length - 1]

    used.add(byePlayer)

    matches.push({
      player1Id: byePlayer,
      player2Id: null,
      roundNumber,
    })
  }

  for (let i = 0; i < sortedPlayers.length; i++) {
    const p1 = sortedPlayers[i]
    if (used.has(p1)) continue

    let paired = false

    for (let j = i + 1; j < sortedPlayers.length; j++) {
      const p2 = sortedPlayers[j]
      if (used.has(p2)) continue

      if (!hasPlayed(p1, p2)) {
        matches.push({
          player1Id: p1,
          player2Id: p2,
          roundNumber,
        })

        used.add(p1)
        used.add(p2)
        paired = true
        break
      }
    }

    // Fallback pairing if no clean opponent found
    if (!paired) {
      const fallback = sortedPlayers.find(
        p => p !== p1 && !used.has(p)
      )

      if (fallback) {
        matches.push({
          player1Id: p1,
          player2Id: fallback,
          roundNumber,
        })

        used.add(p1)
        used.add(fallback)
      }
    }
  }

  return matches
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      tournament: {
        include: {
          participants: {
            where: {
              joinStatus: "PAID",
              checkedIn: true,
            },
          },
        },
      },
    },
  })

  if (!category) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    )
  }

  if (category.currentRound >= category.roundCount) {
    return NextResponse.json(
      { error: "All rounds already generated" },
      { status: 400 }
    )
  }

  const players = category.tournament.participants.map(
    p => p.userId
  )

  if (players.length < 2) {
    return NextResponse.json(
      { error: "Not enough players" },
      { status: 400 }
    )
  }

  // Get all previous matches
  const previousMatches = await prisma.match.findMany({
    where: { categoryId },
  })

  // Calculate standings
  const standings = calculateStandings(previousMatches)

  // Ensure all players are included (important for round 1)
  const existing = new Set(standings.map(s => s.userId))

  for (const userId of players) {
    if (!existing.has(userId)) {
      standings.push({
        userId,
        wins: 0,
        losses: 0,
        points: 0,
      })
    }
  }

  // Sort standings
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.losses - b.losses
  })

  const sortedPlayers = standings.map(s => s.userId)

  const nextRound = category.currentRound + 1

  const swissMatches = generateSwissRound(
    sortedPlayers,
    previousMatches,
    nextRound
  )

  if (swissMatches.length === 0) {
    return NextResponse.json(
      { error: "Swiss pairing failed" },
      { status: 400 }
    )
  }

  await prisma.match.createMany({
    data: swissMatches.map(m => ({
      tournamentId: category.tournamentId,
      categoryId,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      status: "SCHEDULED",
      roundNumber: m.roundNumber,
    })),
  })

  await prisma.category.update({
    where: { id: categoryId },
    data: { currentRound: nextRound },
  })

  return NextResponse.json({
    round: nextRound,
    matchesCreated: swissMatches.length,
  })
}