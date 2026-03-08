import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      categories: true,
      participants: true,
    },
  })

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(tournament)
}