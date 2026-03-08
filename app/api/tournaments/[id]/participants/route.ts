import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params
  const rows = await prisma.tournamentParticipant.findMany({
    where: { tournamentId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  })
  return NextResponse.json(rows)
}