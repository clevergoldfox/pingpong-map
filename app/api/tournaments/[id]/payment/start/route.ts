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
  const userId: string = body?.userId ?? user.id

  if (userId !== user.id) {
    return NextResponse.json({ error: "You can only pay for yourself" }, { status: 403 })
  }

  const participant = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  })

  if (!participant) {
    return NextResponse.json({ error: "Not joined" }, { status: 404 })
  }
  if (participant.joinStatus === "PAID") {
    return NextResponse.json({ ok: true, joinStatus: "PAID" })
  }
  if (!["APPLIED", "PENDING_PAYMENT"].includes(participant.joinStatus)) {
    return NextResponse.json(
      { error: `Cannot start payment in status ${participant.joinStatus}` },
      { status: 409 }
    )
  }

  await prisma.tournamentParticipant.update({
    where: { tournamentId_userId: { tournamentId, userId } },
    data: { joinStatus: "PENDING_PAYMENT" },
  })

  // MVP: real payment gateway can be connected here.
  return NextResponse.json({
    ok: true,
    joinStatus: "PENDING_PAYMENT",
    paymentUrl: `/tournaments/${tournamentId}`,
  })
}

