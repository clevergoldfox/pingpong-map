import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const userId = String(body.userId ?? "")
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const entry = await prisma.teamEntry.findUnique({
    where: { id },
    include: { category: true },
  })
  if (!entry) {
    return NextResponse.json({ error: "TeamEntry not found" }, { status: 404 })
  }
  if (entry.representativeUserId !== user.id) {
    return NextResponse.json({ error: "Only representative can invite members" }, { status: 403 })
  }
  if (entry.status !== "PENDING") {
    return NextResponse.json({ error: "Cannot invite on non-pending entry" }, { status: 400 })
  }

  const invitedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!invitedUser) {
    return NextResponse.json(
      { error: "招待対象ユーザーが見つかりません" },
      { status: 400 }
    )
  }

  // 既にこのカテゴリの他チームに所属していないか
  const otherEntry = await prisma.teamEntry.findFirst({
    where: {
      categoryId: entry.categoryId,
      OR: [
        { representativeUserId: userId },
        { members: { some: { userId } } },
      ],
    },
  })
  if (otherEntry) {
    return NextResponse.json(
      { error: "この種目では既に他のチームに所属しています" },
      { status: 400 }
    )
  }

  // 既存メンバー数＋代表＋今回の招待が最大人数を超えないか（あればチェック）
  if (entry.category.teamMaxMembers != null) {
    const currentCount = await prisma.teamEntryMember.count({
      where: { teamEntryId: entry.id, status: { in: ["INVITED", "APPROVED"] } },
    })
    const totalIfAdded = currentCount + 1 /* invited */ + 1 /* representative */
    if (totalIfAdded > entry.category.teamMaxMembers) {
      return NextResponse.json(
        { error: "この種目の最大メンバー数を超えてしまいます" },
        { status: 400 }
      )
    }
  }

  const member = await prisma.teamEntryMember.create({
    data: {
      teamEntryId: entry.id,
      userId,
    },
  })

  return NextResponse.json(member, { status: 201 })
}

