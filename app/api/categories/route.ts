import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()

  const tournament = await prisma.tournament.findUnique({
    where: { id: body.tournamentId },
  })

  if (!tournament || tournament.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Cannot add category unless tournament is DRAFT" },
      { status: 400 }
    )
  }

  const category = await prisma.category.create({
    data: {
      tournamentId: body.tournamentId,
      type: body.type,
      format: body.format,
      roundCount: body.roundCount ?? null,
    },
  })

  return NextResponse.json(category)
}