import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed to add categories" }, { status: 403 })
  }
  const body = await req.json()

  const tournamentId = body.tournamentId
  if (!tournamentId) {
    return NextResponse.json(
      { error: "tournamentId is required" },
      { status: 400 }
    )
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  })

  if (!tournament || tournament.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Cannot add category unless tournament is DRAFT" },
      { status: 400 }
    )
  }

  // 種目必須
  if (!body.type || !["SINGLES", "DOUBLES", "TEAM"].includes(body.type)) {
    return NextResponse.json(
      { error: "種目（type）は SINGLES / DOUBLES / TEAM のいずれかが必要です" },
      { status: 400 }
    )
  }
  if (!body.format || !["ROUND_ROBIN", "SELECT_ROUND", "TOURNAMENT", "GROUP_TO_TOURNAMENT"].includes(body.format)) {
    return NextResponse.json(
      { error: "形式（format）は ROUND_ROBIN / SELECT_ROUND / TOURNAMENT / GROUP_TO_TOURNAMENT のいずれかが必要です" },
      { status: 400 }
    )
  }
  if (!body.gender || !["MALE", "FEMALE", "MIXED", "MIX"].includes(body.gender)) {
    return NextResponse.json(
      { error: "性別（gender）は MALE / FEMALE / MIXED / MIX のいずれかが必要です" },
      { status: 400 }
    )
  }

  const isLeague =
    body.format === "ROUND_ROBIN" || body.format === "SELECT_ROUND"
  const createData: Parameters<typeof prisma.category.create>[0]["data"] = {
    tournamentId,
    type: body.type,
    format: body.format,
    roundCount: body.roundCount ?? 3,
    gender: body.gender,
    refereeRequired: Boolean(body.refereeRequired),
  }
  if (body.teamMatchStructure != null) createData.teamMatchStructure = body.teamMatchStructure
  if (isLeague && body.leagueMode != null) createData.leagueMode = body.leagueMode
  if (body.fullLeaguePlayerCount != null) createData.fullLeaguePlayerCount = body.fullLeaguePlayerCount
  if (body.selectLeagueMatchCount != null) createData.selectLeagueMatchCount = body.selectLeagueMatchCount
  if (body.capacity != null) createData.capacity = body.capacity
  if (body.minEntries != null) createData.minEntries = body.minEntries
  if (
    createData.capacity != null &&
    createData.minEntries != null &&
    createData.capacity < createData.minEntries
  ) {
    return NextResponse.json(
      { error: "定員は最小催行人数以上にしてください。" },
      { status: 400 }
    )
  }
  if (body.courtRange != null) createData.courtRange = body.courtRange
  if (body.ageRestriction != null) createData.ageRestriction = body.ageRestriction
  if (body.ratingRestriction != null) createData.ratingRestriction = body.ratingRestriction
  if (body.entryFeeCard != null) createData.entryFeeCard = body.entryFeeCard
  if (body.entryFeeCash != null) createData.entryFeeCash = body.entryFeeCash

  const category = await prisma.category.create({
    data: createData,
  })

  return NextResponse.json(category)
}