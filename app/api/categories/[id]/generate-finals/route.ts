import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { calculateStandings } from "@/lib/standings"

type FinalsSize = 4 | 8

function buildFinalPairs(sorted: string[], size: FinalsSize) {
  if (size === 4) {
    // 1v4, 2v3
    return [
      [sorted[0], sorted[3]],
      [sorted[1], sorted[2]],
    ] as const
  }
  // size === 8
  return [
    [sorted[0], sorted[7]],
    [sorted[3], sorted[4]],
    [sorted[1], sorted[6]],
    [sorted[2], sorted[5]],
  ] as const
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params
  const body = await req.json().catch(() => ({}))

  const finalsSize: FinalsSize = body.finalsSize === 8 ? 8 : 4

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

  // Swiss is done when currentRound === roundCount
  if (category.currentRound < category.roundCount) {
    return NextResponse.json(
      { error: "Swiss not finished yet" },
      { status: 400 }
    )
  }

  const players = category.tournament.participants.map(p => p.userId)
  if (players.length < finalsSize) {
    return NextResponse.json(
      { error: `Not enough players for TOP${finalsSize}` },
      { status: 400 }
    )
  }

  // Guard: prevent duplicate finals creation
  const finalsRound = category.currentRound + 1
  const existingFinals = await prisma.match.count({
    where: { categoryId, roundNumber: finalsRound },
  })
  if (existingFinals > 0) {
    return NextResponse.json(
      { error: "Finals already generated" },
      { status: 400 }
    )
  }

  // Get all matches (Swiss history)
  const allMatches = await prisma.match.findMany({ where: { categoryId } })

  // standings from finished matches only (your calculateStandings already filters FINISHED)
  const standings = calculateStandings(allMatches)

  // ensure all players exist (0-match players)
  const map = new Map(standings.map(s => [s.userId, s]))
  for (const userId of players) {
    if (!map.has(userId)) {
      standings.push({ userId, wins: 0, losses: 0, points: 0 })
    }
  }

  // Sort: points desc, wins desc, losses asc (same as your Swiss)
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.losses - b.losses
  })

  const seeded = standings.slice(0, finalsSize).map(s => s.userId)
  const pairs = buildFinalPairs(seeded, finalsSize)

  await prisma.match.createMany({
    data: pairs.map(([p1, p2]) => ({
      tournamentId: category.tournamentId,
      categoryId,
      player1Id: p1,
      player2Id: p2,
      status: "SCHEDULED",
      roundNumber: finalsRound,
    })),
  })

  return NextResponse.json({
    finalsSize,
    finalsRound,
    seeded,
    matchesCreated: pairs.length,
    pairs,
  })
}