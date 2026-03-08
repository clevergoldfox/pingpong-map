import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function generateSelectRoundMatches(players: string[], roundCount: number) {
  const matches: {
    player1Id: string
    player2Id: string
    roundNumber: number
  }[] = []

  const played = new Map<string, Set<string>>()

  for (const p of players) {
    played.set(p, new Set())
  }

  for (let round = 1; round <= roundCount; round++) {
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    const used = new Set<string>()

    for (let i = 0; i < shuffled.length; i++) {
      const p1 = shuffled[i]
      if (used.has(p1)) continue

      const opponent = shuffled.find(
        (p) =>
          p !== p1 &&
          !used.has(p) &&
          !played.get(p1)!.has(p)
      )

      if (!opponent) continue

      played.get(p1)!.add(opponent)
      played.get(opponent)!.add(p1)

      used.add(p1)
      used.add(opponent)

      matches.push({
        player1Id: p1,
        player2Id: opponent,
        roundNumber: round,
      })
    }
  }

  return matches
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      tournament: {
        include: {
          participants: {
            where: { joinStatus: "PAID", checkedIn: true },
          },
        },
      },
    },
  })

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  if (category.format !== "SELECT_ROUND") {
    return NextResponse.json({ error: "Only SELECT_ROUND supported" }, { status: 400 })
  }

  if (!category.roundCount || category.roundCount < 1) {
    return NextResponse.json({ error: "roundCount not set" }, { status: 400 })
  }

  const players = category.tournament.participants.map(p => p.userId)

  if (players.length < 2) {
    return NextResponse.json({ error: "Not enough players" }, { status: 400 })
  }

  const generatedMatches = generateSelectRoundMatches(players, category.roundCount)

  if (generatedMatches.length === 0) {
    return NextResponse.json({ error: "Unable to generate matches" }, { status: 400 })
  }

  await prisma.match.createMany({
    data: generatedMatches.map(m => ({
      tournamentId: category.tournamentId,
      categoryId,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      status: "SCHEDULED",
      roundNumber: m.roundNumber,
    })),
  })

  return NextResponse.json({
    created: generatedMatches.length,
    rounds: category.roundCount,
  })
}