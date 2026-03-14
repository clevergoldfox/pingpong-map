import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { id: tournamentId } = await params
  const body = await req.json().catch(() => ({}))

  const userId: string | undefined = body.userId ?? user.id
  if (userId !== user.id) {
    return NextResponse.json(
      { error: "You can only register yourself for this tournament" },
      { status: 403 }
    )
  }

  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  })

  if (!t) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  if (!["PUBLISHED", "REGISTRATION_OPEN"].includes(t.status)) {
    return NextResponse.json(
      { error: `Cannot join in status ${t.status}` },
      { status: 400 }
    )
  }

  const p = await prisma.tournamentParticipant.upsert({
    where: { tournamentId_userId: { tournamentId, userId } },
    update: { joinStatus: "PAID" },
    create: { tournamentId, userId, joinStatus: "PAID" },
  })

  return NextResponse.json(p)
}