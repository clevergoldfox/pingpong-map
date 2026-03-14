import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

/** PATCH: Assign players to a team match game (organizer only). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }

  const { id: gameId } = await params
  const body = await req.json().catch(() => ({}))

  const game = await prisma.teamMatchGame.findUnique({
    where: { id: gameId },
    include: { teamMatch: { include: { teamA: true, teamB: true } } },
  })
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 })
  }
  if (game.resultStatus === "LOCKED") {
    return NextResponse.json(
      { error: "Cannot change players when result is locked" },
      { status: 400 }
    )
  }

  const data: {
    player1Id?: string | null
    player2Id?: string | null
    player1aId?: string | null
    player1bId?: string | null
    player2aId?: string | null
    player2bId?: string | null
  } = {}
  if (game.type === "SINGLES") {
    if (body.player1Id !== undefined) data.player1Id = body.player1Id || null
    if (body.player2Id !== undefined) data.player2Id = body.player2Id || null
  } else {
    if (body.player1aId !== undefined) data.player1aId = body.player1aId || null
    if (body.player1bId !== undefined) data.player1bId = body.player1bId || null
    if (body.player2aId !== undefined) data.player2aId = body.player2aId || null
    if (body.player2bId !== undefined) data.player2bId = body.player2bId || null
  }

  const updated = await prisma.teamMatchGame.update({
    where: { id: gameId },
    data,
  })
  return NextResponse.json(updated)
}
