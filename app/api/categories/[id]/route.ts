import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed to edit categories" }, { status: 403 })
  }

  const { id } = await params
  const category = await prisma.category.findUnique({
    where: { id },
    include: { tournament: true },
  })
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }
  if (category.tournament.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Cannot edit category unless tournament is DRAFT" },
      { status: 400 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const updateData: Parameters<typeof prisma.category.update>[0]["data"] = {}

  if (body.type != null && ["SINGLES", "DOUBLES", "TEAM"].includes(body.type)) {
    updateData.type = body.type
  }
  if (body.format != null && ["ROUND_ROBIN", "SELECT_ROUND", "TOURNAMENT", "GROUP_TO_TOURNAMENT"].includes(body.format)) {
    updateData.format = body.format
  }
  if (body.gender != null && ["MALE", "FEMALE", "MIXED", "MIX"].includes(body.gender)) {
    updateData.gender = body.gender
  }
  if (body.roundCount != null) updateData.roundCount = body.roundCount
  if (typeof body.refereeRequired === "boolean") updateData.refereeRequired = body.refereeRequired
  if (body.teamMatchStructure != null) updateData.teamMatchStructure = body.teamMatchStructure
  if (body.leagueMode != null) updateData.leagueMode = body.leagueMode
  if (body.fullLeaguePlayerCount != null) updateData.fullLeaguePlayerCount = body.fullLeaguePlayerCount
  if (body.selectLeagueMatchCount != null) updateData.selectLeagueMatchCount = body.selectLeagueMatchCount
  if (body.capacity != null) updateData.capacity = body.capacity
  if (body.minEntries != null) updateData.minEntries = body.minEntries
  if (body.courtRange !== undefined) updateData.courtRange = body.courtRange || null
  if (body.ageRestriction !== undefined) updateData.ageRestriction = body.ageRestriction
  if (body.ratingRestriction !== undefined) updateData.ratingRestriction = body.ratingRestriction
  if (body.entryFeeCard !== undefined) {
    const v = body.entryFeeCard
    updateData.entryFeeCard = v != null && v !== "" ? (typeof v === "number" ? v : parseInt(String(v), 10)) : null
  }
  if (body.entryFeeCash !== undefined) {
    const v = body.entryFeeCash
    updateData.entryFeeCash = v != null && v !== "" ? (typeof v === "number" ? v : parseInt(String(v), 10)) : null
  }

  if (updateData.capacity != null && updateData.minEntries != null && updateData.capacity < updateData.minEntries) {
    return NextResponse.json(
      { error: "定員は最小催行人数以上にしてください。" },
      { status: 400 }
    )
  }

  const updated = await prisma.category.update({
    where: { id },
    data: updateData,
  })
  return NextResponse.json(updated)
}
