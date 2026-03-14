import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

/** DELETE: Remove a member from the team. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }

  const { id: teamId, userId } = await params

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  })
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  await prisma.teamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  })
  return NextResponse.json({ success: true })
}
