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

export default function CheckinPage(
  { params }: { params: Promise<{ id: string }> }
){
  const { id: tournamentId } = use(params)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)

  const loadParticipants = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(
        `${getBaseUrl()}/api/tournaments/${tournamentId}/participants`,
        { cache: "no-store" }
      )

      if (!res.ok) {
        throw new Error("参加者の読み込みに失敗しました")
      }

      const data = await res.json()
      setParticipants(data)
    } catch (e: any) {
      setError(e.message ?? "参加者の読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadParticipants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId])

  const checkin = async(userId:string)=>{
    try {
      setWorkingId(userId)
      setError(null)
      setMessage(null)

      const res = await fetch(
        `${getBaseUrl()}/api/tournaments/${tournamentId}/checkin`,
        {
          method:"POST",
          headers: { "Content-Type": "application/json" },
          body:JSON.stringify({userId})
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error ?? "チェックインに失敗しました")
      }

      setMessage("プレイヤーをチェックインしました")
      await loadParticipants()
    } catch (e: any) {
      setError(e.message ?? "チェックインに失敗しました")
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
                  const canCheckIn =
                    p.joinStatus === "PAID" && !p.checkedIn

                  return (
                    <tr
                      key={p.id}
                      className="border-t border-gray-800"
                    >
                      <td className="px-3 py-2">
                        {p.user?.name ?? p.userId}
                      </td>
                      <td className="px-3 py-2">{p.joinStatus}</td>
                      <td className="px-3 py-2">
                        {p.checkedIn ? "済" : "未"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
                          disabled={!canCheckIn || workingId === p.userId}
                          onClick={() => checkin(p.userId)}
                        >
                          {p.checkedIn
                            ? "チェックイン済み"
                            : workingId === p.userId
                            ? "処理中..."
                            : "チェックイン"}
                        </button>
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