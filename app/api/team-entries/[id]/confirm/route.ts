import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  const { id } = await params

  const entry = await prisma.teamEntry.findUnique({
    where: { id },
    include: {
      category: true,
      members: true,
    },
  })
  if (!entry) {
    return NextResponse.json({ error: "TeamEntry not found" }, { status: 404 })
  }
  if (entry.representativeUserId !== user.id) {
    return NextResponse.json({ error: "Only representative can confirm" }, { status: 403 })
  }
  if (entry.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending entries can be confirmed" }, { status: 400 })
  }

  const approvedMembers = entry.members.filter((m) => m.status === "APPROVED")
  const memberCount = approvedMembers.length + 1 /* representative */
  const { category } = entry

  if (category.teamMinMembers != null && memberCount < category.teamMinMembers) {
    return NextResponse.json(
      { error: `この種目の最小人数（${category.teamMinMembers}人）を満たしていません` },
      { status: 400 }
    )
  }
  if (category.teamMaxMembers != null && memberCount > category.teamMaxMembers) {
    return NextResponse.json(
      { error: `この種目の最大人数（${category.teamMaxMembers}人）を超えています` },
      { status: 400 }
    )
  }

  // 定員チェック（カテゴリ capacity を「チーム数」とみなす）
  if (category.capacity != null) {
    const confirmedTeams = await prisma.team.count({
      where: { categoryId: category.id },
    })
    if (confirmedTeams + 1 > category.capacity) {
      return NextResponse.json(
        { error: "この種目の定員（チーム数）の上限に達しています" },
        { status: 400 }
      )
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedEntry = await tx.teamEntry.update({
      where: { id: entry.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    })

    const team = await tx.team.create({
      data: {
        categoryId: entry.categoryId,
        name: entry.teamName,
      },
    })

    // 代表者を TeamMember に追加
    const membersData = [
      {
        teamId: team.id,
        userId: entry.representativeUserId,
        order: 0,
      },
      ...approvedMembers.map((m, idx) => ({
        teamId: team.id,
        userId: m.userId,
        order: idx + 1,
      })),
    ]
    await tx.teamMember.createMany({ data: membersData })

    return { updatedEntry, team }
  })

  return NextResponse.json(result)
}

