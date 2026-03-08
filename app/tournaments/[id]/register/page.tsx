"use client"

import { use, useEffect, useMemo, useState } from "react"
import { getBaseUrl } from "@/lib/base-url"

type Player = {
  id: string
  name: string
  seasonRating: number
  tier: string
}

type Participant = {
  id: string
  userId: string
  checkedIn: boolean
  joinStatus: string
  user: {
    id: string
    name: string
  }
}

export default function RegisterPlayerPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = use(params)

  const [players, setPlayers] = useState<Player[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const base = getBaseUrl()

        const [playersRes, participantsRes] = await Promise.all([
          fetch(`${base}/api/players`, { cache: "no-store" }),
          fetch(`${base}/api/tournaments/${tournamentId}/participants`, {
            cache: "no-store",
          }),
        ])

        if (!playersRes.ok) {
          throw new Error("Failed to load players")
        }
        if (!participantsRes.ok) {
          throw new Error("Failed to load participants")
        }

        const playersData = await playersRes.json()
        const participantsData = await participantsRes.json()

        setPlayers(playersData)
        setParticipants(participantsData)
      } catch (e: any) {
        setError(e.message ?? "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [tournamentId])

  const alreadyRegisteredIds = useMemo(
    () => new Set(participants.map((p) => p.userId)),
    [participants]
  )

  const handleRegister = async () => {
    if (!selectedUserId) {
      setError("登録するプレイヤーを選択してください")
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setMessage(null)

      const res = await fetch(
        `${getBaseUrl()}/api/tournaments/${tournamentId}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: selectedUserId }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error ?? "プレイヤーの登録に失敗しました")
      }

      setMessage("プレイヤーを登録しました")

      // refresh participants list
      const participantsRes = await fetch(
        `${getBaseUrl()}/api/tournaments/${tournamentId}/participants`,
        { cache: "no-store" }
      )
      if (participantsRes.ok) {
        const participantsData = await participantsRes.json()
        setParticipants(participantsData)
      }
    } catch (e: any) {
      setError(e.message ?? "プレイヤーの登録に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl mb-2 font-semibold">
          大会参加者を登録
        </h1>
        <p className="text-sm text-gray-400">
          既存のプレイヤーを選択して、この大会の参加者として追加します。
        </p>
      </div>

      {loading ? (
        <div>Loading players and participants...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label className="text-sm mb-1">プレイヤーを選択</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="border border-gray-700 bg-black px-3 py-2 rounded min-w-[260px]"
              >
                <option value="">-- プレイヤーを選択してください --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (シーズン {p.seasonRating}, {p.tier}
                    {alreadyRegisteredIds.has(p.id) ? "、参加済み" : ""})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleRegister}
              disabled={submitting}
              className="border border-gray-700 px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
            >
              {submitting ? "登録中..." : "プレイヤーを登録"}
            </button>
          </div>

          {message && <div className="text-green-400 text-sm">{message}</div>}
          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div>
            <h2 className="text-xl mt-6 mb-3 font-semibold">
              現在の参加者
            </h2>
            {participants.length === 0 ? (
              <div className="text-sm text-gray-400">
                まだ参加者が登録されていません。
              </div>
            ) : (
              <table className="w-full border border-gray-700 text-sm">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-3 py-2 text-left">プレイヤー</th>
                    <th className="px-3 py-2 text-left">参加ステータス</th>
                    <th className="px-3 py-2 text-left">チェックイン</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.id} className="border-t border-gray-800">
                      <td className="px-3 py-2">
                        {p.user?.name ?? p.userId}
                      </td>
                      <td className="px-3 py-2">{p.joinStatus}</td>
                      <td className="px-3 py-2">
                        {p.checkedIn ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}