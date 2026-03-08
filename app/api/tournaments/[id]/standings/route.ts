import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { calculateStandings } from "@/lib/standings"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const matches = await prisma.match.findMany({
    where: { tournamentId: id },
  })

  const standings = calculateStandings(matches)

  return NextResponse.json(standings)
}