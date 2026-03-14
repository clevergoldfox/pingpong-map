"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

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

type CategoryRow = {
  id: string
  type: string
  format: string
  gender?: string | null
  entryFeeCard?: number | null
  entryFeeCash?: number | null
}

type TournamentRow = {
  id: string
  name: string
  status?: string
  categories?: CategoryRow[]
}

type MeUser = {
  id: string
  name: string
  role: string
}

export default function RegisterPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: tournamentId } = use(params)

  const [tournament, setTournament] = useState<TournamentRow | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [me, setMe] = useState<MeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const base = getBaseUrl()
      const [tournamentRes, participantsRes, meRes] = await Promise.all([
        fetch(`${base}/api/tournaments/${tournamentId}`, { cache: "no-store" }),
        fetch(`${base}/api/tournaments/${tournamentId}/participants`, {
          cache: "no-store",
        }),
        fetch(`${base}/api/auth/me`, { cache: "no-store" }),
      ])
      if (tournamentRes.ok) {
        const data = await tournamentRes.json()
        setTournament(data)
      } else {
        setTournament(null)
      }
      if (participantsRes.ok) {
        const data = await participantsRes.json()
        setParticipants(data)
      } else {
        setParticipants([])
      }
      if (meRes.ok) {
        const data = await meRes.json()
        setMe(data?.user ?? null)
      } else {
        setMe(null)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [tournamentId])

  const myParticipant = me
    ? participants.find((p) => p.userId === me.id && p.joinStatus !== "CANCELED")
    : null
  const canRegister = me && !myParticipant
  const canUnregister = myParticipant && myParticipant.joinStatus === "PAID"
  const canCheckIn =
    myParticipant &&
    myParticipant.joinStatus === "PAID" &&
    !myParticipant.checkedIn &&
    tournament &&
    ["CHECKIN", "REGISTRATION_CLOSED"].includes(tournament.status ?? "")
  const canUncheckIn =
    myParticipant && myParticipant.checkedIn && tournament && ["CHECKIN", "REGISTRATION_CLOSED"].includes(tournament.status ?? "")

  const handleRegister = async () => {
    if (!me) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${getBaseUrl()}/api/tournaments/${tournamentId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "参加登録に失敗しました")
      setMessage("参加登録しました")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "参加登録に失敗しました")
    } finally {
      setWorking(false)
    }
  }

  const handleUnregister = async () => {
    if (!me) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${getBaseUrl()}/api/tournaments/${tournamentId}/leave`, {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "参加取消に失敗しました")
      setMessage("参加を取消しました")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "参加取消に失敗しました")
    } finally {
      setWorking(false)
    }
  }

  const handleCheckIn = async () => {
    if (!me) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${getBaseUrl()}/api/tournaments/${tournamentId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "チェックインに失敗しました")
      setMessage("チェックインしました")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "チェックインに失敗しました")
    } finally {
      setWorking(false)
    }
  }

  const handleUncheckIn = async () => {
    if (!me) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${getBaseUrl()}/api/tournaments/${tournamentId}/uncheckin`, {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "チェックイン取消に失敗しました")
      setMessage("チェックインを取消しました")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "チェックイン取消に失敗しました")
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl mb-2 font-semibold">大会参加者を登録</h1>
        <p className="text-sm text-gray-400">
          ログイン中のあなた自身の参加登録・参加取消・チェックインを行います。
        </p>
      </div>

      {tournament?.categories && tournament.categories.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">種目・参加費</h2>
          <ul className="space-y-2 text-sm border border-gray-700 rounded divide-y divide-gray-700">
            {tournament.categories.map((c: CategoryRow) => {
              const card = c.entryFeeCard != null ? `カード ¥${c.entryFeeCard}` : null
              const cash = c.entryFeeCash != null ? `当日 ¥${c.entryFeeCash}` : null
              const fee = [card, cash].filter(Boolean).join(" / ") || "—"
              return (
                <li key={c.id} className="px-3 py-2 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.type}</span>
                  <span className="text-gray-400">{c.format}</span>
                  {c.gender && (
                    <span className="text-gray-400">({c.gender})</span>
                  )}
                  <span className="text-gray-300">参加費: {fee}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {loading ? (
        <div className="text-gray-400">読み込み中...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <>
          {!me ? (
            <p className="text-sm text-gray-400">
              <Link href="/auth/login" className="text-blue-400 hover:underline">
                ログイン
              </Link>
              すると参加登録・チェックインができます。
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {canRegister && (
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={working}
                  className="border border-gray-700 px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
                >
                  {working ? "処理中..." : "参加登録"}
                </button>
              )}
              {canUnregister && (
                <button
                  type="button"
                  onClick={handleUnregister}
                  disabled={working}
                  className="border border-gray-600 text-gray-300 px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
                >
                  {working ? "処理中..." : "参加取消"}
                </button>
              )}
              {canCheckIn && (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={working}
                  className="border border-green-700 text-green-300 px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
                >
                  {working ? "処理中..." : "チェックイン"}
                </button>
              )}
              {canUncheckIn && (
                <button
                  type="button"
                  onClick={handleUncheckIn}
                  disabled={working}
                  className="border border-gray-600 text-gray-300 px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
                >
                  {working ? "処理中..." : "チェックイン取消"}
                </button>
              )}
            </div>
          )}

          {message && <div className="text-green-400 text-sm">{message}</div>}
          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div>
            <h2 className="text-xl mt-6 mb-3 font-semibold">現在の参加者</h2>
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
