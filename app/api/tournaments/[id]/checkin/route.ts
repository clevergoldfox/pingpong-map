import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params
  const body = await req.json().catch(() => ({}))
  const userId: string | undefined = body.userId

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  })

  if (!t) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  if (!["CHECKIN", "REGISTRATION_CLOSED"].includes(t.status)) {
    return NextResponse.json(
      { error: `Cannot checkin in status ${t.status}` },
      { status: 400 }
    )
  }

  const participant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId,
        userId,
      },
    },
  })

  if (!participant) {
    return NextResponse.json({ error: "Not joined" }, { status: 404 })
  }

  if (participant.joinStatus !== "PAID") {
    return NextResponse.json(
      { error: `Not eligible (joinStatus=${participant.joinStatus})` },
      { status: 400 }
    )
  }

  const updated = await prisma.tournamentParticipant.update({
    where: {
      tournamentId_userId: {
        tournamentId,
        userId,
      },
    },
    data: { checkedIn: true },
  })

  return NextResponse.json(updated)
}