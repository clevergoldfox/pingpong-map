import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { id: tournamentId } = await params

  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  })

  if (!t) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  if (!["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "CHECKIN"].includes(t.status)) {
    return NextResponse.json(
      { error: `Cannot leave in status ${t.status}` },
      { status: 400 }
    )
  }

  const participant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: { tournamentId, userId: user.id },
    },
  })

  if (!participant) {
    return NextResponse.json({ error: "Not registered for this tournament" }, { status: 404 })
  }

  await prisma.tournamentParticipant.update({
    where: {
      tournamentId_userId: { tournamentId, userId: user.id },
    },
    data: { joinStatus: "CANCELED", canceledAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
