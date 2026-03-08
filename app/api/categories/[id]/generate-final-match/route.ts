import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  })

  if (!category) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    )
  }

  const semiRound = category.currentRound + 1
  const finalRound = category.currentRound + 2

  // Get semifinal matches
  const semifinals = await prisma.match.findMany({
    where: {
      categoryId,
      roundNumber: semiRound,
    },
  })

  if (semifinals.length !== 2) {
    return NextResponse.json(
      { error: "Semifinals not generated correctly" },
      { status: 400 }
    )
  }

  // Ensure both semifinals finished
  const unfinished = semifinals.some(m => m.status !== "FINISHED")
  if (unfinished) {
    return NextResponse.json(
      { error: "Semifinals not finished yet" },
      { status: 400 }
    )
  }

  const winners = semifinals.map(m => m.winnerId).filter(Boolean)

  if (winners.length !== 2) {
    return NextResponse.json(
      { error: "Winner data missing" },
      { status: 400 }
    )
  }

  // Prevent duplicate final creation
  const existingFinal = await prisma.match.findFirst({
    where: {
      categoryId,
      roundNumber: finalRound,
    },
  })

  if (existingFinal) {
    return NextResponse.json(
      { error: "Final already generated" },
      { status: 400 }
    )
  }

  // Create Final match
  await prisma.match.create({
    data: {
      tournamentId: category.tournamentId,
      categoryId,
      player1Id: winners[0]!,
      player2Id: winners[1]!,
      status: "SCHEDULED",
      roundNumber: finalRound,
    },
  })

  return NextResponse.json({
    message: "Final match generated",
    players: winners,
  })
}