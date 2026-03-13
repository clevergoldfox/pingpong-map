import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isDbConnectionError(e: unknown): boolean {
  const msg = (e as any)?.message ?? ""
  const code = (e as any)?.code
  return code === "P1001" || /can't reach database|connection/i.test(String(msg))
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const body = await req.json().catch(() => ({}))
  const { winnerId } = body

  if (!winnerId) {
    return NextResponse.json({ error: "winnerId required" }, { status: 400 })
  }

  const run = async () => {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    })
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }
    if (
      winnerId !== match.player1Id &&
      winnerId !== match.player2Id
    ) {
      return NextResponse.json({ error: "Invalid winner" }, { status: 400 })
    }
    await prisma.match.update({
      where: { id: matchId },
      data: {
        winnerId,
        status: "FINISHED",
      },
    })
    return NextResponse.json({ success: true })
  }

  try {
    return await run()
  } catch (e: unknown) {
    if (isDbConnectionError(e)) {
      await sleep(500)
      try {
        return await run()
      } catch (e2: unknown) {
        return NextResponse.json(
          { error: "データベースに接続できません。しばらく待って再試行してください。" },
          { status: 503 }
        )
      }
    }
    const msg = (e as Error)?.message ?? "Server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params

  const run = async () => {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        resultStatus: true,
        winnerId: true,
        scoreJson: true,
        player1Id: true,
        player2Id: true,
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
    })
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 })

    const subs = await prisma.matchScoreSubmission.findMany({
      where: { matchId },
      select: { submittedById: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      match,
      submissions: subs,
    })
  }

  try {
    return await run()
  } catch (e: unknown) {
    if (isDbConnectionError(e)) {
      await sleep(500)
      try {
        return await run()
      } catch {
        return NextResponse.json(
          { error: "データベースに接続できません。しばらく待って再試行してください。" },
          { status: 503 }
        )
      }
    }
    const msg = (e as Error)?.message ?? "Server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}