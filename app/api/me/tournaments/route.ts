import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

const JOIN_STATUS_LABEL: Record<string, string> = {
  APPLIED: "申込中",
  PENDING_PARTNER: "パートナー待ち",
  PENDING_PAYMENT: "決済待ち",
  PAID: "確定",
  CANCELED: "キャンセル",
  FORFEITED: "棄権",
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const rows = await prisma.tournamentParticipant.findMany({
    where: { userId: user.id },
    include: {
      tournament: {
        select: { id: true, name: true, location: true, status: true, startDate: true, mapUrl: true },
      },
    },
    orderBy: { joinedAt: "desc" },
  })

  const items = rows.map((p) => ({
    id: p.id,
    tournamentId: p.tournamentId,
    joinStatus: p.joinStatus,
    joinStatusLabel: JOIN_STATUS_LABEL[p.joinStatus] ?? p.joinStatus,
    checkedIn: p.checkedIn,
    joinedAt: p.joinedAt,
    canceledAt: p.canceledAt,
    tournament: p.tournament,
  }))

  return NextResponse.json(items)
}

