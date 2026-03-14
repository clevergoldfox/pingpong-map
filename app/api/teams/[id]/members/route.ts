import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

/** POST: Add a member to the team. Body: { userId } */
export async function POST(
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

  const { id: teamId } = await params
  const body = await req.json().catch(() => ({}))
  const userId = body.userId

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { category: true },
  })
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 })
  }

  // User must be a tournament participant (checked-in) for this category's tournament
  const participant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId: team.category.tournamentId,
        userId,
      },
    },
  })
  if (!participant || participant.joinStatus !== "PAID" || !participant.checkedIn) {
    return NextResponse.json(
      { error: "User must be a checked-in participant of this tournament" },
      { status: 400 }
    )
  }

  // User must not already be in another team in this category
  const existingInCategory = await prisma.teamMember.findFirst({
    where: {
      team: { categoryId: team.categoryId },
      userId,
    },
  })
  if (existingInCategory) {
    return NextResponse.json(
      { error: "User is already in a team in this category" },
      { status: 400 }
    )
  }

  const count = await prisma.teamMember.count({ where: { teamId } })
  await prisma.teamMember.create({
    data: { teamId, userId, order: count },
  })
  const updated = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: { orderBy: { order: "asc" }, include: { user: true } } },
  })
  return NextResponse.json(updated)
}
