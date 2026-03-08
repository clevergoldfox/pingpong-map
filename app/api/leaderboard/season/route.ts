import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
    return NextResponse.json({ error: "No active season" }, { status: 400 })
  }

  const users = await prisma.user.findMany({
    orderBy: { seasonRating: "desc" },
    select: {
      id: true,
      name: true,
      seasonRating: true,
      tier: true,
    },
  })

  return NextResponse.json({
    season: activeSeason.name,
    users,
  })
}