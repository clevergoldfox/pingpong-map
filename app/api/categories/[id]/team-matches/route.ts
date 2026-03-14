import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

/** GET: List team matches for a category. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  })
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }
  if (category.type !== "TEAM") {
    return NextResponse.json(
      { error: "Category is not a team category" },
      { status: 400 }
    )
  }

  const teamMatches = await prisma.teamMatch.findMany({
    where: { categoryId },
    orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }],
    include: {
      teamA: true,
      teamB: true,
      games: { orderBy: { slotOrder: "asc" } },
    },
  })
  return NextResponse.json(teamMatches)
}
