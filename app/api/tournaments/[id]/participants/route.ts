import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const tournamentId = ctx.params.id
  const rows = await prisma.tournamentParticipant.findMany({
    where: { tournamentId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  })
  return NextResponse.json(rows)
}