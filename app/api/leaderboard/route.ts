import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get("page") ?? 1)
  const limit = 50
  const skip = (page - 1) * limit

  const users = await prisma.user.findMany({
    orderBy: { rating: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      name: true,
      rating: true,
    },
  })

  return NextResponse.json({ page, users })
}