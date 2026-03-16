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

  const updated = await prisma.teamEntryMember.update({
    where: { id },
    data: {
      status: "REJECTED",
      respondedAt: new Date(),
    },
  })

  return NextResponse.json(updated)
}

