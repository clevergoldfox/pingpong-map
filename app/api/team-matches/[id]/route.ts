import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/** GET: Single team match with teams and games. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const teamMatch = await prisma.teamMatch.findUnique({
    where: { id },
    include: {
      category: true,
      teamA: { include: { members: { include: { user: true } } } },
      teamB: { include: { members: { include: { user: true } } } },
      games: { orderBy: { slotOrder: "asc" } },
    },
  })
  if (!teamMatch) {
    return NextResponse.json({ error: "Team match not found" }, { status: 404 })
  }
  return NextResponse.json(teamMatch)
}
