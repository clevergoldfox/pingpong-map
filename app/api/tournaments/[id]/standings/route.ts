import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { calculateStandings } from "@/lib/standings"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const matches = await prisma.match.findMany({
    where: { tournamentId: id },
    select: {
      id: true,
      status: true,
      player1Id: true,
      player2Id: true,
      winnerId: true,
      player1: { select: { id: true, name: true } },
      player2: { select: { id: true, name: true } },
    },
  })

  const standings = calculateStandings(matches as any)

  const userMap = new Map<string, { id: string; name: string }>()
  for (const m of matches) {
    if (m.player1) userMap.set(m.player1.id, m.player1)
    if (m.player2) userMap.set(m.player2.id, m.player2)
  }

  return NextResponse.json(
    standings.map((s) => ({
      ...s,
      user: userMap.get(s.userId) ?? null,
    }))
  )
}