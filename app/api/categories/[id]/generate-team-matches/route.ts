import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

type Slot = { order: number; type: string }

/** POST: Generate team matches (round-robin between teams) and games per match from teamMatchStructure. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed to generate team matches" }, { status: 403 })
  }

  const { id: categoryId } = await params

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      teams: {
        orderBy: { order: "asc" },
        include: { members: { orderBy: { order: "asc" } } },
      },
    },
  })

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }
  if (category.type !== "TEAM") {
    return NextResponse.json(
      { error: "Category must be type TEAM" },
      { status: 400 }
    )
  }

  const structure = category.teamMatchStructure as Slot[] | null
  if (!Array.isArray(structure) || structure.length === 0) {
    return NextResponse.json(
      { error: "teamMatchStructure is required for TEAM category (at least one slot)" },
      { status: 400 }
    )
  }

  const teams = category.teams
  if (teams.length < 2) {
    return NextResponse.json(
      { error: "At least 2 teams are required" },
      { status: 400 }
    )
  }

  const existing = await prisma.teamMatch.count({ where: { categoryId } })
  if (existing > 0) {
    return NextResponse.json(
      { error: "Team matches already exist for this category" },
      { status: 400 }
    )
  }

  // Round-robin: all pairs (A,B), (A,C), (A,D), (B,C), (B,D), (C,D)
  const pairs: [string, string][] = []
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairs.push([teams[i].id, teams[j].id])
    }
  }

  const slots: Slot[] = structure
    .filter((s) => s && typeof s.order === "number" && (s.type === "SINGLES" || s.type === "DOUBLES"))
    .sort((a, b) => a.order - b.order)

  if (slots.length === 0) {
    return NextResponse.json(
      { error: "Valid teamMatchStructure slots (order, type SINGLES|DOUBLES) required" },
      { status: 400 }
    )
  }

  let roundNumber = 1
  for (const [teamAId, teamBId] of pairs) {
    const teamMatch = await prisma.teamMatch.create({
      data: {
        categoryId,
        teamAId,
        teamBId,
        roundNumber,
        status: "SCHEDULED",
      },
    })
    for (const slot of slots) {
      await prisma.teamMatchGame.create({
        data: {
          teamMatchId: teamMatch.id,
          slotOrder: slot.order,
          type: slot.type,
        },
      })
    }
    roundNumber++
  }

  const created = await prisma.teamMatch.findMany({
    where: { categoryId },
    include: { teamA: true, teamB: true, games: true },
  })

  return NextResponse.json({
    created: created.length,
    totalGames: created.length * slots.length,
    teamMatches: created,
  })
}
