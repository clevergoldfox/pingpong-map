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

  if (category.type === "DOUBLES" && memberCount !== 2) {
    return NextResponse.json(
      { error: "ダブルスは2名（代表者＋パートナー1名）で確定できます" },
      { status: 400 }
    )
  }

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

    let team: { id: string } | null = null
    if (category.type === "TEAM") {
      const createdTeam = await tx.team.create({
        data: {
          categoryId: entry.categoryId,
          name: entry.teamName,
        },
      })

      // 代表者を TeamMember に追加
      const membersData = [
        {
          teamId: createdTeam.id,
          userId: entry.representativeUserId,
          order: 0,
        },
        ...approvedMembers.map((m, idx) => ({
          teamId: createdTeam.id,
          userId: m.userId,
          order: idx + 1,
        })),
      ]
      await tx.teamMember.createMany({ data: membersData })
      team = createdTeam
    }

    const allUserIds = [entry.representativeUserId, ...approvedMembers.map((m) => m.userId)]
    for (const memberUserId of allUserIds) {
      const existing = await tx.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId: entry.tournamentId,
            userId: memberUserId,
          },
        },
      })
      await tx.tournamentParticipant.upsert({
        where: {
          tournamentId_userId: {
            tournamentId: entry.tournamentId,
            userId: memberUserId,
          },
        },
        update: {
          joinStatus: existing?.joinStatus === "PAID" ? "PAID" : "PENDING_PAYMENT",
          canceledAt: null,
        },
        create: {
          tournamentId: entry.tournamentId,
          userId: memberUserId,
          joinStatus: "PENDING_PAYMENT",
        },
      })
    }

    return { updatedEntry, team }
  })

  return NextResponse.json(result)
}

