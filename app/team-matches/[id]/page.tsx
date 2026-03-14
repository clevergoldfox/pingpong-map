"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

type User = { id: string; name: string }
type Member = { userId: string; user: User }
type Team = { id: string; name: string; members: Member[] }
type Game = {
  id: string
  slotOrder: number
  type: string
  player1Id: string | null
  player2Id: string | null
  player1aId: string | null
  player1bId: string | null
  player2aId: string | null
  player2bId: string | null
  winnerId: string | null
  winnerSide: number | null
  scoreJson: unknown
  resultStatus: string
}
type TeamMatch = {
  id: string
  roundNumber: number
  status: string
  winnerTeamId: string | null
  category: { id: string; tournamentId?: string }
  teamA: Team
  teamB: Team
  games: Game[]
}

export default function TeamMatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: teamMatchId } = use(params)
  const [match, setMatch] = useState<TeamMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [workingGameId, setWorkingGameId] = useState<string | null>(null)
  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }[]>>({})
  const [winnerInput, setWinnerInput] = useState<Record<string, string>>({})
  const base = getBaseUrl()

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${base}/api/team-matches/${teamMatchId}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "Failed to load")
      setMatch(data)
      const existing: Record<string, { p1: string; p2: string }[]> = {}
      for (const g of data.games ?? []) {
        const arr = Array.isArray(g.scoreJson) ? g.scoreJson : []
        existing[g.id] = arr.length
          ? arr.map((x: { p1?: number; p2?: number }) => ({ p1: String(x.p1 ?? ""), p2: String(x.p2 ?? "") }))
          : [{ p1: "", p2: "" }]
      }
      setScoreInputs(existing)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [teamMatchId])

  const submitScore = async (gameId: string, type: string) => {
    const scores = scoreInputs[gameId]
    if (!scores?.length) return
    const scoreJson = scores
      .filter((s) => s.p1 !== "" || s.p2 !== "")
      .map((s) => ({ p1: parseInt(s.p1, 10) || 0, p2: parseInt(s.p2, 10) || 0 }))
    if (scoreJson.length === 0) return
    const winner = winnerInput[gameId]
    setWorkingGameId(gameId)
    setError(null)
    setMessage(null)
    try {
      const body: { scoreJson: object; winnerId?: string; winnerSide?: number } = { scoreJson }
      if (type === "SINGLES" && winner) body.winnerId = winner
      if (type === "DOUBLES" && (winner === "1" || winner === "2")) body.winnerSide = Number(winner)
      const res = await fetch(`${base}/api/team-match-games/${gameId}/submit-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit score")
      setMessage("スコアを保存しました")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setWorkingGameId(null)
    }
  }

  const setScoreRow = (gameId: string, index: number, field: "p1" | "p2", value: string) => {
    setScoreInputs((prev) => {
      const arr = [...(prev[gameId] ?? [{ p1: "", p2: "" }])]
      arr[index] = { ...arr[index], [field]: value }
      return { ...prev, [gameId]: arr }
    })
  }

  const addScoreRow = (gameId: string) => {
    setScoreInputs((prev) => {
      const arr = [...(prev[gameId] ?? [{ p1: "", p2: "" }])]
      arr.push({ p1: "", p2: "" })
      return { ...prev, [gameId]: arr }
    })
  }

  if (loading) return <div className="text-gray-400">読み込み中...</div>
  if (!match) return <div className="text-red-400">{error ?? "Not found"}</div>

  const tournamentId = match.category?.tournamentId

  return (
    <div className="space-y-6">
      <div>
        {tournamentId && (
          <Link href={`/tournaments/${tournamentId}/categories`} className="text-sm text-blue-400 hover:underline">
            ← カテゴリ一覧
          </Link>
        )}
        <h1 className="text-2xl font-bold mt-2">
          {match.teamA.name} vs {match.teamB.name}
        </h1>
        <p className="text-sm text-gray-400">
          第{match.roundNumber}試合 • ステータス: {match.status}
          {match.winnerTeamId && (
            <span className="ml-2 text-green-400">
              勝者: {match.winnerTeamId === match.teamA.id ? match.teamA.name : match.teamB.name}
            </span>
          )}
        </p>
      </div>

      {message && <div className="text-green-400 text-sm">{message}</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      <section>
        <h2 className="text-lg font-semibold mb-3">試合枠（スコア入力）</h2>
        <div className="space-y-4">
          {match.games.map((g) => (
            <div key={g.id} className="border border-gray-700 rounded p-4">
              <div className="font-medium mb-2">
                第{g.slotOrder}枠: {g.type === "SINGLES" ? "シングルス" : "ダブルス"}
                {g.resultStatus === "LOCKED" && (
                  <span className="ml-2 text-green-400 text-sm">確定</span>
                )}
              </div>
              {g.type === "SINGLES" && (
                <div className="text-sm text-gray-400 mb-2">
                  {match.teamA.name}: {g.player1Id ? (match.teamA.members.find((m) => m.userId === g.player1Id)?.user?.name ?? g.player1Id) : "未割当"} /{" "}
                  {match.teamB.name}: {g.player2Id ? (match.teamB.members.find((m) => m.userId === g.player2Id)?.user?.name ?? g.player2Id) : "未割当"}
                </div>
              )}
              {g.type === "DOUBLES" && (
                <div className="text-sm text-gray-400 mb-2">
                  {match.teamA.name}: {[g.player1aId, g.player1bId].map((id) => (id ? (match.teamA.members.find((m) => m.userId === id)?.user?.name ?? id) : "?")).join("・")} /{" "}
                  {match.teamB.name}: {[g.player2aId, g.player2bId].map((id) => (id ? (match.teamB.members.find((m) => m.userId === id)?.user?.name ?? id) : "?")).join("・")}
                </div>
              )}
              {g.resultStatus !== "LOCKED" && (
                <>
                  <div className="space-y-1 text-sm mb-2">
                    {(scoreInputs[g.id] ?? [{ p1: "", p2: "" }]).map((row, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="number"
                          className="w-16 border border-gray-700 bg-black px-2 py-1 rounded"
                          placeholder="A"
                          value={row.p1}
                          onChange={(e) => setScoreRow(g.id, i, "p1", e.target.value)}
                        />
                        <span>-</span>
                        <input
                          type="number"
                          className="w-16 border border-gray-700 bg-black px-2 py-1 rounded"
                          placeholder="B"
                          value={row.p2}
                          onChange={(e) => setScoreRow(g.id, i, "p2", e.target.value)}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-xs text-blue-400 hover:underline"
                      onClick={() => addScoreRow(g.id)}
                    >
                      + ゲームを追加
                    </button>
                  </div>
                  {g.type === "SINGLES" && (
                    <div className="mb-2">
                      <label className="text-sm text-gray-400 mr-2">勝者:</label>
                      <select
                        className="border border-gray-700 bg-black px-2 py-1 rounded text-sm"
                        value={winnerInput[g.id] ?? ""}
                        onChange={(e) => setWinnerInput((prev) => ({ ...prev, [g.id]: e.target.value }))}
                      >
                        <option value="">選択</option>
                        {g.player1Id && (
                          <option value={g.player1Id}>
                            {match.teamA.members.find((m) => m.userId === g.player1Id)?.user?.name ?? g.player1Id}
                          </option>
                        )}
                        {g.player2Id && (
                          <option value={g.player2Id}>
                            {match.teamB.members.find((m) => m.userId === g.player2Id)?.user?.name ?? g.player2Id}
                          </option>
                        )}
                      </select>
                    </div>
                  )}
                  {g.type === "DOUBLES" && (
                    <div className="mb-2">
                      <label className="text-sm text-gray-400 mr-2">勝者:</label>
                      <select
                        className="border border-gray-700 bg-black px-2 py-1 rounded text-sm"
                        value={winnerInput[g.id] ?? ""}
                        onChange={(e) => setWinnerInput((prev) => ({ ...prev, [g.id]: e.target.value }))}
                      >
                        <option value="">選択</option>
                        <option value="1">{match.teamA.name}</option>
                        <option value="2">{match.teamB.name}</option>
                      </select>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={workingGameId === g.id}
                    className="border border-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-900 disabled:opacity-50"
                    onClick={() => submitScore(g.id, g.type)}
                  >
                    {workingGameId === g.id ? "送信中..." : "スコアを確定"}
                  </button>
                </>
              )}
              {g.resultStatus === "LOCKED" && g.scoreJson && (
                <div className="text-sm text-gray-400">
                  スコア: {JSON.stringify(g.scoreJson)}
                  {g.winnerId && ` / 勝者ID: ${g.winnerId}`}
                  {g.winnerSide != null && ` / 勝者: ${g.winnerSide === 1 ? match.teamA.name : match.teamB.name}`}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
