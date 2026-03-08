export type GameScore = { game: number; p1: number; p2: number }
export type ScoreJson = GameScore[]

export function normalizeScoreJson(scores: ScoreJson): ScoreJson {
  // sort by game and validate basic ranges
  const normalized = [...scores]
    .map(s => ({ game: s.game, p1: s.p1, p2: s.p2 }))
    .sort((a, b) => a.game - b.game)

  // basic validation
  for (const s of normalized) {
    if (!Number.isInteger(s.game) || s.game < 1) throw new Error("Invalid game index")
    if (!Number.isInteger(s.p1) || !Number.isInteger(s.p2)) throw new Error("Invalid points")
    if (s.p1 < 0 || s.p2 < 0) throw new Error("Invalid points")
  }
  // ensure unique game numbers
  const set = new Set(normalized.map(s => s.game))
  if (set.size !== normalized.length) throw new Error("Duplicate game index")

  return normalized
}

export function stableStringify(obj: unknown): string {
  // deterministic stringify for equality check
  return JSON.stringify(obj)
}

export function decideWinnerFromScores(scores: ScoreJson): "P1" | "P2" {
  let p1Wins = 0
  let p2Wins = 0
  for (const g of scores) {
    if (g.p1 === g.p2) continue // should not happen in real match; treat as invalid upstream if you want
    if (g.p1 > g.p2) p1Wins++
    else p2Wins++
  }
  if (p1Wins === p2Wins) {
    // for MVP: disallow tie
    throw new Error("Cannot decide winner (tie).")
  }
  return p1Wins > p2Wins ? "P1" : "P2"
}