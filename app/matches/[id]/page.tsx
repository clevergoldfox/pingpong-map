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

  const [userId, setUserId] = useState("")
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
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load match")
      }
      setMatch(data.match)
      setSubmissions(data.submissions ?? [])
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
      setError("Please enter your user ID")
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
      setError("Please enter at least one valid game score")
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
        throw new Error(data?.error ?? "Failed to submit result")
      }

      setMessage("Result submitted")
      await loadMatch()
    } catch (e: any) {
      setError(e.message ?? "Failed to submit result")
    } finally {
      setSubmitting(false)
    }
  }

  return(
    <div className="space-y-6">
      <h1 className="text-2xl mb-2 font-bold">
        Submit Match Result
      </h1>

      {loading ? (
        <div>Loading match...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : match ? (
        <>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-gray-400">Match ID:</span> {match.id}
            </div>
            <div>
              <span className="text-gray-400">Players:</span>{" "}
              {match.player1Id} vs {match.player2Id ?? "BYE"}
            </div>
            <div>
              <span className="text-gray-400">Status:</span>{" "}
              {match.status} ({match.resultStatus})
            </div>
            {match.winnerId && (
              <div>
                <span className="text-gray-400">Winner:</span>{" "}
                {match.winnerId}
              </div>
            )}
          </div>

          <div className="border border-gray-800 rounded p-4 space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm">
                Your User ID (must be one of the players)
              </label>
              <input
                className="border border-gray-700 bg-black px-3 py-2 rounded text-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your user ID"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Game scores</h2>
                <button
                  type="button"
                  onClick={addGame}
                  className="text-sm border border-gray-700 px-3 py-1 rounded hover:bg-gray-900"
                >
                  Add game
                </button>
              </div>

              <div className="space-y-2">
                {games.map((g, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-10 text-gray-400">
                      Game {idx + 1}
                    </span>
                    <input
                      type="number"
                      className="w-20 border border-gray-700 bg-black px-2 py-1 rounded"
                      value={g.p1}
                      onChange={(e) =>
                        updateGame(idx, "p1", e.target.value)
                      }
                      placeholder="P1"
                    />
                    <span className="text-gray-400">:</span>
                    <input
                      type="number"
                      className="w-20 border border-gray-700 bg-black px-2 py-1 rounded"
                      value={g.p2}
                      onChange={(e) =>
                        updateGame(idx, "p2", e.target.value)
                      }
                      placeholder="P2"
                    />
                    {games.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGame(idx)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Remove
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
              {submitting ? "Submitting..." : "Submit Result"}
            </button>

            {message && (
              <div className="text-green-400 text-sm">{message}</div>
            )}
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Submissions</h2>
            {submissions.length === 0 ? (
              <div className="text-sm text-gray-400">
                No submissions yet.
              </div>
            ) : (
              <ul className="text-sm space-y-1">
                {submissions.map((s, i) => (
                  <li key={i}>
                    {s.submittedById} at{" "}
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