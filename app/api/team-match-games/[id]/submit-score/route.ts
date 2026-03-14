import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

/** POST: Submit or update score for a team match game. Body: { scoreJson, winnerSide? (1|2 for doubles), winnerId? (for singles) } */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { id: gameId } = await params
  const body = await req.json().catch(() => ({}))

  const game = await prisma.teamMatchGame.findUnique({
    where: { id: gameId },
    include: {
      teamMatch: {
        include: {
          teamA: { include: { members: true } },
          teamB: { include: { members: true } },
        },
      },
    },
  })
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 })
  }
  if (game.resultStatus === "LOCKED") {
    return NextResponse.json(
      { error: "This game result is locked" },
      { status: 400 }
    )
  }

  // Only organizers or a player in this game can submit
  const isOrganizer = user.role === "ADMIN" || user.role === "ORGANIZER"
  const playersInGame: string[] = []
  if (game.type === "SINGLES" && game.player1Id) playersInGame.push(game.player1Id)
  if (game.type === "SINGLES" && game.player2Id) playersInGame.push(game.player2Id)
  if (game.type === "DOUBLES") {
    if (game.player1aId) playersInGame.push(game.player1aId)
    if (game.player1bId) playersInGame.push(game.player1bId)
    if (game.player2aId) playersInGame.push(game.player2aId)
    if (game.player2bId) playersInGame.push(game.player2bId)
  }
  const isPlayerInGame = playersInGame.includes(user.id)
  if (!isOrganizer && !isPlayerInGame) {
    return NextResponse.json(
      { error: "Only organizers or players in this game can submit the score" },
      { status: 403 }
    )
  }

  const scoreJson = body.scoreJson
  if (!scoreJson || typeof scoreJson !== "object") {
    return NextResponse.json(
      { error: "scoreJson (array of { game, p1, p2 } or similar) is required" },
      { status: 400 }
    )
  }

  const winnerSide = body.winnerSide != null ? Number(body.winnerSide) : null
  const winnerId = body.winnerId ?? null

  const updateData: {
    scoreJson: object
    winnerId?: string | null
    winnerSide?: number | null
    resultStatus?: "LOCKED"
  } = { scoreJson }
  if (game.type === "SINGLES" && winnerId) {
    updateData.winnerId = winnerId
  }
  if (game.type === "DOUBLES" && (winnerSide === 1 || winnerSide === 2)) {
    updateData.winnerSide = winnerSide
  }
  // Mark as locked when winner is set (optional: could stay PENDING until organizer locks)
  if (winnerId || (game.type === "DOUBLES" && (winnerSide === 1 || winnerSide === 2))) {
    updateData.resultStatus = "LOCKED"
  }

  const updated = await prisma.teamMatchGame.update({
    where: { id: gameId },
    data: updateData,
  })

  // If all games in the team match are LOCKED, set team match winner and status
  const allGames = await prisma.teamMatchGame.findMany({
    where: { teamMatchId: game.teamMatchId },
    orderBy: { slotOrder: "asc" },
  })
  const allLocked = allGames.every((g) => g.resultStatus === "LOCKED")
  if (allLocked) {
    let teamAWins = 0
    let teamBWins = 0
    for (const g of allGames) {
      if (g.type === "SINGLES" && g.winnerId) {
        const teamAIds = game.teamMatch.teamA.members.map((m) => m.userId)
        if (teamAIds.includes(g.winnerId)) teamAWins++
        else teamBWins++
      } else if (g.type === "DOUBLES" && g.winnerSide != null) {
        if (g.winnerSide === 1) teamAWins++
        else teamBWins++
      }
    }
    const winnerTeamId =
      teamAWins > teamBWins
        ? game.teamMatch.teamAId
        : teamBWins > teamAWins
          ? game.teamMatch.teamBId
          : null
    await prisma.teamMatch.update({
      where: { id: game.teamMatchId },
      data: { status: "FINISHED", winnerTeamId },
    })
  }

  return NextResponse.json(updated)
}
