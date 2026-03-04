import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type Body = {
  name?: string
  durationDays?: number
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body

    const seasonName = body.name ?? `Season ${Date.now()}`
    const durationDays = body.durationDays ?? 90

    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Deactivate current season
      await tx.season.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })

      const now = new Date()
      const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

      // 2️⃣ Create new season
      const newSeason = await tx.season.create({
        data: {
          name: seasonName,
          startAt: now,
          endAt: end,
          isActive: true,
        },
      })

      // 3️⃣ Reset season rating for all users
      await tx.user.updateMany({
        data: { seasonRating: 500 },
      })

      return newSeason
    })

    return NextResponse.json({
      success: true,
      season: result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Season start failed" },
      { status: 500 }
    )
  }
}