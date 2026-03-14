"use client"

import { use, useEffect, useState } from "react"
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

type MeUser = { id: string; name: string; role: string }

export default function CheckinPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = use(params)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [me, setMe] = useState<MeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)

  const loadParticipants = async () => {
    try {
      setLoading(true)
      setError(null)
      const base = getBaseUrl()
      const [participantsRes, meRes] = await Promise.all([
        fetch(`${base}/api/tournaments/${tournamentId}/participants`, {
          cache: "no-store",
        }),
        fetch(`${base}/api/auth/me`, { cache: "no-store" }),
      ])

      if (!participantsRes.ok) {
        throw new Error("参加者の読み込みに失敗しました")
      }
      const participantsData = await participantsRes.json()
      setParticipants(participantsData)

      if (meRes.ok) {
        const meData = await meRes.json()
        setMe(meData?.user ?? null)
      } else {
        setMe(null)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "参加者の読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadParticipants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId])

  const checkin = async () => {
    if (!me) return
    try {
      setWorkingId(me.id)
      setError(null)
      setMessage(null)
      const res = await fetch(
        `${getBaseUrl()}/api/tournaments/${tournamentId}/checkin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: me.id }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? "チェックインに失敗しました")
      }
      setMessage("プレイヤーをチェックインしました")
      await loadParticipants()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "チェックインに失敗しました")
    } finally {
      setWorkingId(null)
    }
  }

  const uncheckin = async () => {
    if (!me) return
    try {
      setWorkingId(me.id)
      setError(null)
      setMessage(null)
      const res = await fetch(
        `${getBaseUrl()}/api/tournaments/${tournamentId}/uncheckin`,
        { method: "POST" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? "チェックイン取消に失敗しました")
      }
      setMessage("チェックインを取消しました")
      await loadParticipants()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "チェックイン取消に失敗しました")
    } finally {
      setWorkingId(null)
    }
  }

  return(
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl mb-2 font-semibold">
          プレイヤーチェックイン
        </h1>
        <p className="text-sm text-gray-400">
          参加ステータスが「PAID」のプレイヤーのみチェックインできます。
          チェックインしていないプレイヤーは大会開始時に棄権扱いになります。
        </p>
      </div>

      {loading ? (
        <div>Loading participants...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <>
          {message && <div className="text-green-400 text-sm">{message}</div>}

          {participants.length === 0 ? (
            <div className="text-sm text-gray-400">
              まだ参加者がいません。先に参加者登録を行ってください。
            </div>
          ) : (
            <table className="w-full border border-gray-700 text-sm">
              <thead>
                <tr className="bg-gray-900">
                  <th className="px-3 py-2 text-left">プレイヤー</th>
                  <th className="px-3 py-2 text-left">参加ステータス</th>
                  <th className="px-3 py-2 text-left">チェックイン</th>
                  <th className="px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const isSelf = me && p.userId === me.id
                  const canCheckIn =
                    isSelf && p.joinStatus === "PAID" && !p.checkedIn

                  return (
                    <tr key={p.id} className="border-t border-gray-800">
                      <td className="px-3 py-2">
                        {p.user?.name ?? p.userId}
                      </td>
                      <td className="px-3 py-2">{p.joinStatus}</td>
                      <td className="px-3 py-2">
                        {p.checkedIn ? "済" : "未"}
                      </td>
                      <td className="px-3 py-2">
                        {isSelf ? (
                          <>
                            {p.checkedIn ? (
                              <button
                                type="button"
                                className="border border-gray-600 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50 text-gray-300"
                                disabled={!!workingId}
                                onClick={uncheckin}
                              >
                                {workingId === p.userId
                                  ? "処理中..."
                                  : "チェックイン取消"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
                                disabled={!canCheckIn || !!workingId}
                                onClick={checkin}
                              >
                                {workingId === p.userId
                                  ? "処理中..."
                                  : "チェックイン"}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">
                            {p.checkedIn ? "チェックイン済み" : "未チェックイン"}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}