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
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed to start tournaments" }, { status: 403 })
  }
  const { id: tournamentId } = await params
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } })
  if (!t) return NextResponse.json({ error: "Tournament not found" }, { status: 404 })

  if (!["CHECKIN", "REGISTRATION_CLOSED"].includes(t.status)) {
    return NextResponse.json({ error: `Cannot start in status ${t.status}` }, { status: 400 })
  }

  // 未チェックインは棄権（キャンセル料100%想定 → joinStatus=FORFEITED, rating反映なしは後工程）
  const result = await prisma.$transaction(async (tx) => {
    await tx.tournamentParticipant.updateMany({
      where: { tournamentId, joinStatus: "PAID", checkedIn: false },
      data: { joinStatus: "FORFEITED" },
    })

    const started = await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "STARTED" },
    })

    return started
  })

  return NextResponse.json(result)
}