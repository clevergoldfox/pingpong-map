import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

/** PATCH: Update team name/order. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }

  const { id: teamId } = await params
  const body = await req.json().catch(() => ({}))

  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 })
  }

  const data: { name?: string; order?: number } = {}
  if (typeof body.name === "string") data.name = body.name.trim()
  if (typeof body.order === "number") data.order = body.order

  const updated = await prisma.team.update({
    where: { id: teamId },
    data,
    include: { members: { include: { user: true } } },
  })
  return NextResponse.json(updated)
}

/** DELETE: Remove team. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }

  const { id: teamId } = await params
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 })
  }

  await prisma.team.delete({ where: { id: teamId } })
  return NextResponse.json({ success: true })
}
