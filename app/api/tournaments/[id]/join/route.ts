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