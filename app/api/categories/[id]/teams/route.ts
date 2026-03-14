import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

/** GET: List teams for a category (TEAM type). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      teams: {
        orderBy: { order: "asc" },
        include: {
          members: { orderBy: { order: "asc" }, include: { user: true } },
        },
      },
    },
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
  return NextResponse.json(category.teams)
}

/** POST: Create a team (organizer only). */
export async function POST(
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

  const { id: categoryId } = await params
  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json(
      { error: "Team name is required" },
      { status: 400 }
    )
  }

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

  const count = await prisma.team.count({ where: { categoryId } })
  const team = await prisma.team.create({
    data: {
      categoryId,
      name,
      order: count,
    },
    include: {
      members: { include: { user: true } },
    },
  })
  return NextResponse.json(team)
}
