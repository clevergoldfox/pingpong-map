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

  if (!["CHECKIN", "REGISTRATION_CLOSED"].includes(t.status)) {
    return NextResponse.json(
      { error: `Cannot uncheck in when tournament status is ${t.status}` },
      { status: 400 }
    )
  }

  const participant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: { tournamentId, userId: user.id },
    },
  })

  if (!participant) {
    return NextResponse.json({ error: "Not joined" }, { status: 404 })
  }

  await prisma.tournamentParticipant.update({
    where: {
      tournamentId_userId: { tournamentId, userId: user.id },
    },
    data: { checkedIn: false },
  })

  return NextResponse.json({ success: true })
}
