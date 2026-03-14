"use client"

import { use, useEffect, useState } from "react"
import { getBaseUrl } from "@/lib/base-url"

type MatchInfo = {
  id: string
  status: string
  resultStatus: string
  winnerId: string | null
  scoreJson: any
  player1Id: string
  player2Id: string | null
  player1?: { id: string; name: string }
  player2?: { id: string; name: string } | null
}

type SubmissionInfo = {
  submittedById: string
  createdAt: string
}

type GameRow = { p1: string; p2: string }

export default function MatchPage(
  { params }:{params:Promise<{id:string}>}
){
  const { id: matchId } = use(params)

  const [userId, setUserId] = useState<string>("")
  const [games, setGames] = useState<GameRow[]>([{ p1: "", p2: "" }])
  const [match, setMatch] = useState<MatchInfo | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadMatch = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${getBaseUrl()}/api/matches/${matchId}/result`, {
        cache: "no-store",
      })
      let data: { match?: MatchInfo; submissions?: SubmissionInfo[]; error?: string }
      try {
        data = await res.json()
      } catch {
        throw new Error(res.ok ? "データの取得に失敗しました" : "サーバーエラーです。しばらく待って再読み込みしてください。")
      }
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load match")
      }
      setMatch(data.match ?? null)
      setSubmissions(data.submissions ?? [])
      const m = data.match
      if (m?.player2Id == null && m?.player1Id) setUserId(m.player1Id)
      else setUserId("")
    } catch (e: any) {
      setError(e.message ?? "Failed to load match")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  const updateGame = (index: number, field: "p1" | "p2", value: string) => {
    setGames((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addGame = () => {
    setGames((prev) => [...prev, { p1: "", p2: "" }])
  }

  const removeGame = (index: number) => {
    setGames((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = async()=>{
    if (!userId) {
      setError("あなたを選択してください")
      return
    }

    const scores = games
      .map((g, idx) => ({
        game: idx + 1,
        p1: Number(g.p1),
        p2: Number(g.p2),
      }))
      .filter((g) => !Number.isNaN(g.p1) && !Number.isNaN(g.p2))

    if (scores.length === 0) {
      setError("少なくとも1ゲーム分の有効なスコアを入力してください")
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setMessage(null)

      const res = await fetch(
        `${getBaseUrl()}/api/matches/${matchId}/submit-score`,
        {
          method:"POST",
          headers: { "Content-Type": "application/json" },
          body:JSON.stringify({
            userId,
            clientRequestId:crypto.randomUUID(),
            scores,
          })
        }
      )

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "結果の送信に失敗しました")
      }

      setMessage("結果を送信しました")
      await loadMatch()
    } catch (e: any) {
      setError(e.message ?? "結果の送信に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  const submittedByLabel = (id: string) => {
    if (!match) return id
    if (id === match.player1Id) return match.player1?.name ?? id
    if (id === match.player2Id) return match.player2?.name ?? id
    return id
  }

  return(
    <div className="space-y-6">
      <h1 className="text-2xl mb-2 font-bold">
        試合結果を送信
      </h1>

      {loading ? (
        <div>試合情報を読み込み中...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : match ? (
        <>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-gray-400">試合ID:</span> {match.id}
            </div>
            <div>
              <span className="text-gray-400">対戦:</span>{" "}
              {match.player1?.name ?? match.player1Id} vs{" "}
              {match.player2 ? match.player2.name : match.player2Id ?? "不戦勝"}
            </div>
            <div>
              <span className="text-gray-400">ステータス:</span>{" "}
              {match.status} ({match.resultStatus})
            </div>
            {match.winnerId && (
              <div>
                <span className="text-gray-400">勝者:</span>{" "}
                {match.winnerId === match.player1Id
                  ? (match.player1?.name ?? match.winnerId)
                  : (match.player2?.name ?? match.winnerId)}
              </div>
            )}
          </div>

          <div className="border border-gray-800 rounded p-4 space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm">
                あなた（対戦プレイヤーのいずれかを選択）
              </label>
              <select
                className="border border-gray-700 bg-black px-3 py-2 rounded text-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">-- 選択してください --</option>
                <option value={match.player1Id}>
                  {match.player1?.name || match.player1Id}
                </option>
                {match.player2Id && (
                  <option value={match.player2Id}>
                    {match.player2?.name || match.player2Id}
                  </option>
                )}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">各ゲームのスコア</h2>
                <button
                  type="button"
                  onClick={addGame}
                  className="text-sm border border-gray-700 px-3 py-1 rounded hover:bg-gray-900"
                >
                  ゲームを追加
                </button>
              </div>

              <div className="space-y-2">
                {games.map((g, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-10 text-gray-400">
                      第{idx + 1}ゲーム
                    </span>
                    <input
                      type="number"
                      className="w-20 border border-gray-700 bg-black px-2 py-1 rounded"
                      value={g.p1}
                      onChange={(e) =>
                        updateGame(idx, "p1", e.target.value)
                      }
                      placeholder="P1得点"
                    />
                    <span className="text-gray-400">:</span>
                    <input
                      type="number"
                      className="w-20 border border-gray-700 bg-black px-2 py-1 rounded"
                      value={g.p2}
                      onChange={(e) =>
                        updateGame(idx, "p2", e.target.value)
                      }
                      placeholder="P2得点"
                    />
                    {games.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGame(idx)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="border border-gray-700 px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
            >
              {submitting ? "送信中..." : "結果を送信"}
            </button>

            {message && (
              <div className="text-green-400 text-sm">{message}</div>
            )}
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">提出履歴</h2>
            {submissions.length === 0 ? (
              <div className="text-sm text-gray-400">
                まだ提出はありません。
              </div>
            ) : (
              <ul className="text-sm space-y-1">
                {submissions.map((s, i) => (
                  <li key={i}>
                    {submittedByLabel(s.submittedById)} at{" "}
                    {new Date(s.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}