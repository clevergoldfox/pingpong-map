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
        throw new Error("Failed to load participants")
      }

      const data = await res.json()
      setParticipants(data)
    } catch (e: any) {
      setError(e.message ?? "Failed to load participants")
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
        throw new Error(data?.error ?? "Failed to check in player")
      }

      setMessage("Player checked in")
      await loadParticipants()
    } catch (e: any) {
      setError(e.message ?? "Failed to check in player")
    } finally {
      setWorkingId(null)
    }
  }

  return(
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl mb-2 font-semibold">
          Player Check-in
        </h1>
        <p className="text-sm text-gray-400">
          Only players with join status &quot;PAID&quot; can be checked in.
          Not checked-in players will be forfeited when the tournament starts.
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
              No participants yet. Register players first.
            </div>
          ) : (
            <table className="w-full border border-gray-700 text-sm">
              <thead>
                <tr className="bg-gray-900">
                  <th className="px-3 py-2 text-left">Player</th>
                  <th className="px-3 py-2 text-left">Join Status</th>
                  <th className="px-3 py-2 text-left">Checked-in</th>
                  <th className="px-3 py-2 text-left">Actions</th>
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
                        {p.checkedIn ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
                          disabled={!canCheckIn || workingId === p.userId}
                          onClick={() => checkin(p.userId)}
                        >
                          {p.checkedIn
                            ? "Already checked-in"
                            : workingId === p.userId
                            ? "Checking in..."
                            : "Check-in"}
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