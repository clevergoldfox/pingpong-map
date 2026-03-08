import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
  })

  if (!user) {
    return NextResponse.json(null)
  }

  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { player1Id: id },
        { player2Id: id },
      ],
      status: "FINISHED",
    },
  })

  const wins = matches.filter(m => m.winnerId === id).length
  const losses = matches.length - wins

  return NextResponse.json({
    ...user,
    matchCount: matches.length,
    wins,
    losses,
  })
}