import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const body = await req.json().catch(() => ({}))
  const { winnerId } = body

  if (!winnerId) {
    return NextResponse.json({ error: "winnerId required" }, { status: 400 })
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
  })

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }

  if (
    winnerId !== match.player1Id &&
    winnerId !== match.player2Id
  ) {
    return NextResponse.json({ error: "Invalid winner" }, { status: 400 })
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId,
      status: "FINISHED",
    },
  })

  return NextResponse.json({ success: true })
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      resultStatus: true,
      winnerId: true,
      scoreJson: true,
      player1Id: true,
      player2Id: true,
    },
  })
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 })

  const subs = await prisma.matchScoreSubmission.findMany({
    where: { matchId },
    select: { submittedById: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    match,
    submissions: subs,
  })
}