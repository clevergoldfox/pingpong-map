import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      tournament: {
        include: {
          participants: {
            where: { joinStatus: "PAID", checkedIn: true },
          },
        },
      },
    },
  })

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  if (category.format !== "SELECT_ROUND") {
    return NextResponse.json({ error: "Only SELECT_ROUND supported" }, { status: 400 })
  }

  const players = category.tournament.participants.map(p => p.userId)

  if (players.length < 2) {
    return NextResponse.json({ error: "Not enough players" }, { status: 400 })
  }

  const matches: Prisma.MatchCreateManyInput[] = []

  const shuffled = [...players].sort(() => Math.random() - 0.5)

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    matches.push({
      tournamentId: category.tournamentId,
      categoryId,
      player1Id: shuffled[i],
      player2Id: shuffled[i + 1],
      status: "SCHEDULED",
    })
  }

  await prisma.match.createMany({ data: matches })

  return NextResponse.json({ created: matches.length })
}