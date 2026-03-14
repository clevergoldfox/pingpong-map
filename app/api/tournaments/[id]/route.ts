import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

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
    return await prisma.tournament.findUnique({
      where: { id },
      include: {
        categories: true,
        participants: true,
      },
    })
  }

  try {
    const tournament = await run()
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(tournament)
  } catch (e: unknown) {
    if (isDbConnectionError(e)) {
      await sleep(500)
      try {
        const tournament = await run()
        if (!tournament) {
          return NextResponse.json(
            { error: "Tournament not found" },
            { status: 404 }
          )
        }
        return NextResponse.json(tournament)
      } catch {
        return NextResponse.json(
          { error: "データベースに接続できません。しばらく待って再試行してください。" },
          { status: 503 }
        )
      }
    }
    const msg = (e as Error)?.message ?? "Failed to load tournament"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** PATCH: 大会要項の更新（ステップ②）および公開（ステップ④） */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed to update tournaments" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const doPatch = async () => {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { categories: true },
    })

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      )
    }

    // 公開時バリデーション（ステップ④）
    if (body.status === "PUBLISHED" || body.status === "REGISTRATION_OPEN") {
      if (!tournament.name?.trim()) {
        return NextResponse.json(
          { error: "大会名を入力してください" },
          { status: 400 }
        )
      }
      if (!tournament.location?.trim()) {
        return NextResponse.json(
          { error: "会場場所を入力してください" },
          { status: 400 }
        )
      }
      if (tournament.categories.length === 0) {
        return NextResponse.json(
          { error: "種目を1つ以上作成してください" },
          { status: 400 }
        )
      }
    }

    const data: {
      name?: string
      location?: string
      startDate?: Date
      status?: (typeof tournament)["status"]
      mapUrl?: string | null
      openAt?: Date | null
      entryDeadlineAt?: Date | null
      cancelPolicy?: string | null
      organizer?: string | null
      sponsor?: string | null
      description?: string | null
    } = {}
    if (body.name !== undefined) data.name = body.name
    if (body.location !== undefined) data.location = body.location
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate)
    if (body.status !== undefined) data.status = body.status
    if (body.mapUrl !== undefined) data.mapUrl = body.mapUrl || null
    if (body.openAt !== undefined) data.openAt = body.openAt ? new Date(body.openAt) : null
    if (body.entryDeadlineAt !== undefined) data.entryDeadlineAt = body.entryDeadlineAt ? new Date(body.entryDeadlineAt) : null
    if (body.cancelPolicy !== undefined) data.cancelPolicy = body.cancelPolicy || null
    if (body.organizer !== undefined) data.organizer = body.organizer || null
    if (body.sponsor !== undefined) data.sponsor = body.sponsor || null
    if (body.description !== undefined) data.description = body.description || null

    const effectiveStartDate = data.startDate ?? tournament.startDate
    const effectiveEntryDeadline =
      data.entryDeadlineAt !== undefined
        ? data.entryDeadlineAt
        : tournament.entryDeadlineAt
    if (
      effectiveEntryDeadline != null &&
      effectiveStartDate != null &&
      effectiveEntryDeadline > effectiveStartDate
    ) {
      return NextResponse.json(
        { error: "申込締切日時は大会開始日時以前に設定してください。" },
        { status: 400 }
      )
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  }

  try {
    return await doPatch()
  } catch (e: unknown) {
    if (isDbConnectionError(e)) {
      await sleep(500)
      try {
        return await doPatch()
      } catch {
        return NextResponse.json(
          { error: "データベースに接続できません。しばらく待って再試行してください。" },
          { status: 503 }
        )
      }
    }
    const msg = (e as Error)?.message ?? "Failed to update tournament"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}