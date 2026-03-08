import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {

  const players = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      seasonRating: true,
      tier: true
    },
    orderBy: {
      seasonRating: "desc"
    }
  })

  return NextResponse.json(players)
}