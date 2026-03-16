import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const invitations = await prisma.teamEntryMember.findMany({
    where: { userId: user.id },
    include: {
      teamEntry: {
        include: {
          category: { select: { id: true, type: true, gender: true } },
          tournament: { select: { id: true, name: true } },
          representative: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { invitedAt: "desc" },
  })

  return NextResponse.json(invitations)
}

