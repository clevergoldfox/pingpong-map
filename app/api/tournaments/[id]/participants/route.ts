import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isDbConnectionError(e: unknown): boolean {
  const msg = String((e as any)?.message ?? "")
  const code = (e as any)?.code
  return code === "P1001" || /can't reach database|connection/i.test(msg)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params

  const run = async () => {
    return await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    })
  }

  try {
    const rows = await run()
    return NextResponse.json(rows)
  } catch (e: unknown) {
    if (isDbConnectionError(e)) {
      await sleep(500)
      try {
        const rows = await run()
        return NextResponse.json(rows)
      } catch {
        return NextResponse.json(
          { error: "データベースに接続できません。しばらく待って再試行してください。" },
          { status: 503 }
        )
      }
    }
    const msg = (e as Error)?.message ?? "Failed to load participants"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}