import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const matches = await prisma.match.findMany({
    where: { tournamentId: id },
    include: {
      player1: true,
      player2: true,
    },
    orderBy: {
      roundNumber: "asc",
    },
  })

  return NextResponse.json(matches)
}