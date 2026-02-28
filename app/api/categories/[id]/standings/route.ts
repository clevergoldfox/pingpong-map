import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params

  const matches = await prisma.match.findMany({
    where: {
      categoryId,
      status: "FINISHED",
    },
  })

  const stats: Record<string, { wins: number; losses: number }> = {}

  for (const match of matches) {
    if (!match.player2Id) continue

    if (!stats[match.player1Id])
      stats[match.player1Id] = { wins: 0, losses: 0 }

    if (!stats[match.player2Id])
      stats[match.player2Id] = { wins: 0, losses: 0 }

    if (match.winnerId === match.player1Id) {
      stats[match.player1Id].wins++
      stats[match.player2Id].losses++
    } else if (match.winnerId === match.player2Id) {
      stats[match.player2Id].wins++
      stats[match.player1Id].losses++
    }
  }

  const standings = Object.entries(stats)
    .map(([userId, record]) => ({
      userId,
      wins: record.wins,
      losses: record.losses,
      points: record.wins * 3, // basic point system
    }))
    .sort((a, b) => b.points - a.points)

  return NextResponse.json(standings)
}