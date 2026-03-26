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

  const member = await prisma.teamEntryMember.findUnique({
    where: { id },
    include: {
      teamEntry: {
        include: { category: true },
      },
    },
  })
  if (!member) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
  }
  if (member.userId !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }
  if (member.status !== "INVITED") {
    return NextResponse.json({ error: "Already responded" }, { status: 400 })
  }

  const entry = member.teamEntry
  if (entry.status !== "PENDING") {
    return NextResponse.json({ error: "Cannot approve for non-pending entry" }, { status: 400 })
  }

  // 最大人数チェック（代表＋承認済み＋今回の自分）
  const { category } = entry
  if (category.teamMaxMembers != null) {
    const approvedCount = await prisma.teamEntryMember.count({
      where: { teamEntryId: entry.id, status: "APPROVED" },
    })
    const totalIfApproved = approvedCount + 1 /* self */ + 1 /* representative */
    if (totalIfApproved > category.teamMaxMembers) {
      return NextResponse.json(
        { error: "この種目の最大メンバー数を超えてしまいます" },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.teamEntryMember.update({
    where: { id },
    data: {
      status: "APPROVED",
      respondedAt: new Date(),
    },
  })

  const meParticipant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId: entry.tournamentId,
        userId: user.id,
      },
    },
  })

  await prisma.tournamentParticipant.upsert({
    where: {
      tournamentId_userId: {
        tournamentId: entry.tournamentId,
        userId: user.id,
      },
    },
    update: {
      joinStatus: meParticipant?.joinStatus === "PAID" ? "PAID" : "PENDING_PARTNER",
      canceledAt: null,
    },
    create: {
      tournamentId: entry.tournamentId,
      userId: user.id,
      joinStatus: "PENDING_PARTNER",
    },
  })

  return NextResponse.json(updated)
}

