import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  const { id: categoryId } = await params

  const entry = await prisma.teamEntry.findFirst({
    where: {
      categoryId,
      OR: [
        { representativeUserId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  })

  return NextResponse.json(entry)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  const { id: categoryId } = await params
  const body = await req.json().catch(() => ({}))
  const teamName = String(body.teamName ?? "").trim()
  if (!teamName) {
    return NextResponse.json({ error: "teamName is required" }, { status: 400 })
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { tournament: true },
  })
  if (!category || !["TEAM", "DOUBLES"].includes(category.type)) {
    return NextResponse.json(
      { error: "TEAM/DOUBLES category not found" },
      { status: 404 }
    )
  }

  // 代表者を大会参加者として確保（団体戦は支払い前にメンバー調整する）
  const existingParticipant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId: category.tournamentId,
        userId: user.id,
      },
    },
  })
  if (existingParticipant && ["CANCELED", "FORFEITED"].includes(existingParticipant.joinStatus)) {
    return NextResponse.json(
      { error: "大会参加状態が無効のため団体戦に申込みできません" },
      { status: 400 }
    )
  }
  await prisma.tournamentParticipant.upsert({
    where: {
      tournamentId_userId: {
        tournamentId: category.tournamentId,
        userId: user.id,
      },
    },
    update: {
      joinStatus:
        existingParticipant?.joinStatus === "PAID" ? "PAID" : "PENDING_PARTNER",
      canceledAt: null,
    },
    create: {
      tournamentId: category.tournamentId,
      userId: user.id,
      joinStatus: "PENDING_PARTNER",
    },
  })

  // 既にこのカテゴリで代表もしくはメンバーになっていないか
  const existing = await prisma.teamEntry.findFirst({
    where: {
      categoryId,
      OR: [
        { representativeUserId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: "この種目では既にエントリー済みです" },
      { status: 400 }
    )
  }

  const entry = await prisma.teamEntry.create({
    data: {
      categoryId,
      tournamentId: category.tournamentId,
      teamName,
      representativeUserId: user.id,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}

