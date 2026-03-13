import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params

  // 1️⃣ Find highest round number in this category
  const highestRoundMatch = await prisma.match.findFirst({
    where: { categoryId },
    orderBy: { roundNumber: "desc" },
  })

  if (!highestRoundMatch) {
    return NextResponse.json(
      { error: "No matches found" },
      { status: 404 }
    )
  }

  const finalRound = highestRoundMatch.roundNumber

  // 2️⃣ Find finished match in highest round
  const finalMatch = await prisma.match.findFirst({
    where: {
      categoryId,
      roundNumber: finalRound,
      status: "FINISHED",
    },
  })

  if (!finalMatch || !finalMatch.winnerId) {
    return NextResponse.json(
      { error: "Final not finished yet" },
      { status: 400 }
    )
  }

  const champion = await prisma.user.findUnique({
    where: { id: finalMatch.winnerId },
    select: { id: true, name: true },
  })

  // 3️⃣ Return champion
  return NextResponse.json({
    categoryId,
    finalRound,
    championId: finalMatch.winnerId,
    champion: champion ?? null,
  })
}