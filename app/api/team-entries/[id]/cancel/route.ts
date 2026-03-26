import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  const { id } = await params

  const entry = await prisma.teamEntry.findUnique({
    where: { id },
    include: { members: true },
  })
  if (!entry) {
    return NextResponse.json({ error: "TeamEntry not found" }, { status: 404 })
  }
  if (entry.representativeUserId !== user.id) {
    return NextResponse.json({ error: "Only representative can cancel" }, { status: 403 })
  }
  if (entry.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending entries can be canceled" }, { status: 400 })
  }

  const updated = await prisma.teamEntry.update({
    where: { id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  })

  const relatedUserIds = [entry.representativeUserId, ...entry.members.map((m) => m.userId)]
  await prisma.tournamentParticipant.updateMany({
    where: {
      tournamentId: entry.tournamentId,
      userId: { in: relatedUserIds },
      joinStatus: { in: ["PENDING_PARTNER", "PENDING_PAYMENT"] },
    },
    data: {
      joinStatus: "APPLIED",
    },
  })

  return NextResponse.json(updated)
}

