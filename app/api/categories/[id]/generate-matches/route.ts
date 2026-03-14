import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

type MatchRow = {
  player1Id: string
  player2Id: string
  roundNumber: number
}

/** セレクトリーグ: 指定ラウンド数ぶんの試合を生成（1ラウンドあたり1対戦ずつ、重複なし優先） */
function generateSelectRoundMatches(players: string[], roundCount: number): MatchRow[] {
  const matches: MatchRow[] = []
  const played = new Map<string, Set<string>>()
  for (const p of players) played.set(p, new Set())

  for (let round = 1; round <= roundCount; round++) {
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    const used = new Set<string>()
    for (let i = 0; i < shuffled.length; i++) {
      const p1 = shuffled[i]
      if (used.has(p1)) continue
      const opponent = shuffled.find(
        (p) => p !== p1 && !used.has(p) && !played.get(p1)!.has(p)
      )
      if (!opponent) continue
      played.get(p1)!.add(opponent)
      played.get(opponent)!.add(p1)
      used.add(p1)
      used.add(opponent)
      matches.push({ player1Id: p1, player2Id: opponent, roundNumber: round })
    }
  }
  return matches
}

/** フルリーグ: 全対戦 C(n,2) を生成し、ラウンドに振り分け */
function generateFullLeagueMatches(players: string[]): MatchRow[] {
  const pairs: [string, string][] = []
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      pairs.push([players[i], players[j]])
    }
  }
  const shuffled = pairs.sort(() => Math.random() - 0.5)
  const matches: MatchRow[] = []
  let round = 1
  const usedInRound = new Set<string>()
  for (const [a, b] of shuffled) {
    if (usedInRound.has(a) || usedInRound.has(b)) {
      round++
      usedInRound.clear()
    }
    usedInRound.add(a)
    usedInRound.add(b)
    matches.push({
      player1Id: a,
      player2Id: b,
      roundNumber: round,
    })
  }
  return matches
}

/** セレクトリーグ（試合数指定）: 指定試合数だけ生成（未対戦ペア優先） */
function generateSelectMatchCountMatches(
  players: string[],
  matchCount: number
): MatchRow[] {
  const matches: MatchRow[] = []
  const played = new Map<string, Set<string>>()
  for (const p of players) played.set(p, new Set())

  const pool: [string, string][] = []
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      pool.push([players[i], players[j]])
    }
  }
  const shuffled = pool.sort(() => Math.random() - 0.5)
  let round = 1
  let created = 0
  for (const [a, b] of shuffled) {
    if (created >= matchCount) break
    if (played.get(a)?.has(b)) continue
    played.get(a)!.add(b)
    played.get(b)!.add(a)
    matches.push({ player1Id: a, player2Id: b, roundNumber: round })
    created++
    round++
  }
  return matches
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed to generate matches" }, { status: 403 })
  }
  const { id: categoryId } = await params

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      tournament: {
        include: {
          participants: {
            where: { joinStatus: "PAID", checkedIn: true },
          },
        },
      },
    },
  })

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  const isLeague =
    category.format === "ROUND_ROBIN" || category.format === "SELECT_ROUND"
  if (!isLeague) {
    return NextResponse.json(
      { error: "League format (ROUND_ROBIN or SELECT_ROUND) required" },
      { status: 400 }
    )
  }

  const players = category.tournament.participants.map((p) => p.userId)
  if (players.length < 2) {
    return NextResponse.json(
      { error: "Not enough players (need 2+ checked-in)" },
      { status: 400 }
    )
  }

  let generatedMatches: MatchRow[]

  if (category.leagueMode === "FULL") {
    if (players.length < 3 || players.length > 7) {
      return NextResponse.json(
        { error: "FULL league requires 3–7 players (checked-in)" },
        { status: 400 }
      )
    }
    generatedMatches = generateFullLeagueMatches(players)
  } else if (category.leagueMode === "SELECT") {
    const matchCount =
      category.selectLeagueMatchCount ?? category.roundCount ?? 5
    const clamped = Math.min(10, Math.max(3, matchCount))
    generatedMatches = generateSelectMatchCountMatches(players, clamped)
  } else {
    const roundCount = category.roundCount ?? 3
    if (roundCount < 1) {
      return NextResponse.json(
        { error: "roundCount or leagueMode required" },
        { status: 400 }
      )
    }
    generatedMatches = generateSelectRoundMatches(players, roundCount)
  }

  if (generatedMatches.length === 0) {
    return NextResponse.json(
      { error: "Unable to generate matches" },
      { status: 400 }
    )
  }

  await prisma.match.createMany({
    data: generatedMatches.map((m) => ({
      tournamentId: category.tournamentId,
      categoryId,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      status: "SCHEDULED",
      roundNumber: m.roundNumber,
    })),
  })

  const maxRound = Math.max(...generatedMatches.map((m) => m.roundNumber))
  return NextResponse.json({
    created: generatedMatches.length,
    rounds: maxRound,
    leagueMode: category.leagueMode ?? "legacy",
  })
}