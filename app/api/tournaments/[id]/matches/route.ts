import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isDbConnectionError(e: unknown): boolean {
  const msg = String((e as any)?.message ?? "")
  const code = (e as any)?.code
  return code === "P1001" || /can't reach database|connection/i.test(msg)
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const run = async () => {
    return await prisma.match.findMany({
      where: { tournamentId: id },
      include: {
        player1: true,
        player2: true,
        category: { select: { refereeRequired: true } },
        referees: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: {
        roundNumber: "asc",
      },
    })
  }

  try {
    const matches = await run()
    return NextResponse.json(matches)
  } catch (e: unknown) {
    if (isDbConnectionError(e)) {
      await sleep(500)
      try {
        const matches = await run()
        return NextResponse.json(matches)
      } catch {
        return NextResponse.json(
          { error: "データベースに接続できません。しばらく待って再試行してください。" },
          { status: 503 }
        )
      }
    }
    const msg = (e as Error)?.message ?? "Failed to load matches"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}