"use client"

import { use, useEffect, useMemo, useState } from "react"
import { getBaseUrl } from "@/lib/base-url"

type MatchRow = {
  id: string
  categoryId: string
  roundNumber: number | null
  player1Id: string
  player2Id: string | null
  player1?: { id: string; name: string }
  player2?: { id: string; name: string }
  category?: { refereeRequired: boolean }
  referees?: Array<{ user: { id: string; name: string } }>
}

type ParticipantRow = {
  userId: string
  checkedIn: boolean
  joinStatus: string
  user: { id: string; name: string }
}

export default function MatchesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [tournamentId, setTournamentId] = useState<string>("")
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [participantsWarning, setParticipantsWarning] = useState<string | null>(
    null
  )
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null)

  useEffect(() => {
    params.then((p) => setTournamentId(p.id))
  }, [params])

  const load = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      setParticipantsWarning(null)
      const base = getBaseUrl()
      const [mRes, pRes] = await Promise.all([
        fetch(`${base}/api/tournaments/${id}/matches`, { cache: "no-store" }),
        fetch(`${base}/api/tournaments/${id}/participants`, {
          cache: "no-store",
        }),
      ])
      const mData = await mRes.json()
      if (!mRes.ok) throw new Error(mData?.error ?? "Failed to load matches")
      setMatches(mData)

      if (pRes.ok) {
        const pData = await pRes.json()
        setParticipants(pData)
      } else {
        const pData = await pRes.json().catch(() => ({}))
        setParticipants([])
        setParticipantsWarning(
          pData?.error ??
            "参加者一覧の取得に失敗しました（審判候補が表示されません）"
        )
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!tournamentId) return
    load(tournamentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId])

  const refereeCandidates = useMemo(() => {
    return participants
      .filter((p) => p.checkedIn && p.joinStatus === "PAID")
      .map((p) => p.user)
  }, [participants])

  // 種目ごとに「その種目に出場している参加者」の ID 一覧（審判候補を同種目内に絞る用）
  const categoryParticipantIdsByCategoryId = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const m of matches) {
      const catId = m.categoryId
      if (!catId) continue
      if (!map.has(catId)) map.set(catId, new Set())
      if (m.player1Id) map.get(catId)!.add(m.player1Id)
      if (m.player2Id) map.get(catId)!.add(m.player2Id)
    }
    return map
  }, [matches])

  const setReferee = async (matchId: string, userId: string | null) => {
    try {
      setSavingMatchId(matchId)
      setError(null)
      const res = await fetch(`${getBaseUrl()}/api/matches/${matchId}/referee`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to set referee")

      // Update local state optimistically
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? {
                ...m,
                referees: userId
                  ? [{ user: { id: userId, name: data.referee?.name ?? "" } }]
                  : [],
              }
            : m
        )
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to set referee")
    } finally {
      setSavingMatchId(null)
    }
  }

  if (loading) return <div className="text-gray-400">読み込み中...</div>
  if (error) return <div className="text-red-400">{error}</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl mb-2">試合一覧</h1>
      <p className="text-sm text-gray-400">
        審判ありの種目では、各試合に審判を割り当てられます。候補は同種目出場者（チェックイン済み）のみです。
      </p>
      {participantsWarning && (
        <div className="text-amber-300 text-sm">
          {participantsWarning}
        </div>
      )}

      <div className="space-y-2">
        {matches.map((m) => {
          const refereeRequired = m.category?.refereeRequired === true
          const currentRef = m.referees?.[0]?.user ?? null
          const exclude = new Set([m.player1Id, m.player2Id].filter(Boolean))
          const sameCategoryIds = m.categoryId
            ? categoryParticipantIdsByCategoryId.get(m.categoryId)
            : undefined
          const options = refereeCandidates.filter(
            (u) =>
              !exclude.has(u.id) &&
              (sameCategoryIds ? sameCategoryIds.has(u.id) : true)
          )
          const disabled = savingMatchId === m.id

          return (
            <div key={m.id} className="border border-gray-800 rounded p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">
                    {m.player1?.name ?? m.player1Id} vs{" "}
                    {m.player2 ? m.player2.name : m.player2Id ?? "不戦勝"}
                  </div>
                  <div className="text-xs text-gray-400">
                    第{m.roundNumber ?? "?"}ラウンド
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {refereeRequired ? (
                    <>
                      <select
                        value={currentRef?.id ?? ""}
                        onChange={(e) =>
                          setReferee(m.id, e.target.value || null)
                        }
                        className="border border-gray-700 bg-black px-2 py-1 rounded"
                        disabled={disabled}
                      >
                        <option value="">審判なし</option>
                        {options.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      {disabled && (
                        <span className="text-xs text-gray-400">保存中...</span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500 text-xs">
                      審判なし（この種目は審判不要）
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}