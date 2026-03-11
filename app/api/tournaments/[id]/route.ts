import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      categories: true,
      participants: true,
    },
  })

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(tournament)
}

/** PATCH: 大会要項の更新（ステップ②）および公開（ステップ④） */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))

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

  const updated = await prisma.tournament.update({
    where: { id },
    data,
  })

  return NextResponse.json(updated)
}