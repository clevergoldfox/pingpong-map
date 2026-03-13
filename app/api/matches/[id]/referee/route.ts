import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params

  const row = await prisma.matchRefereeAssignment.findUnique({
    where: { matchId },
    include: { user: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ referee: row?.user ?? null })
}

type PutBody = { userId: string | null }

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const body = (await req.json().catch(() => null)) as PutBody | null

  if (!body || body.userId === undefined) {
    return NextResponse.json({ error: "userId is required (string|null)" }, { status: 400 })
  }

  // If null -> remove assignment
  if (body.userId === null) {
    await prisma.matchRefereeAssignment.deleteMany({ where: { matchId } })
    return NextResponse.json({ success: true, referee: null })
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, categoryId: true, player1Id: true, player2Id: true, category: { select: { refereeRequired: true } } },
  })

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }
  if (!match.category?.refereeRequired) {
    return NextResponse.json({ error: "Referee is not required for this category" }, { status: 400 })
  }
  // Prevent assigning a player as referee for their own match (basic rule)
  if (body.userId === match.player1Id || body.userId === match.player2Id) {
    return NextResponse.json({ error: "Players cannot be referees for their own match" }, { status: 400 })
  }

  // Ensure user exists
  const user = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, name: true },
  })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Upsert assignment (1 per match)
  await prisma.matchRefereeAssignment.upsert({
    where: { matchId },
    update: { userId: body.userId },
    create: { matchId, userId: body.userId },
  })

  return NextResponse.json({ success: true, referee: user })
}

