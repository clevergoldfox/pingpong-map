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
      setError("Please select a player to register")
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
        throw new Error(data?.error ?? "Failed to register player")
      }

      setMessage("Player registered successfully")

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
      setError(e.message ?? "Failed to register player")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl mb-2 font-semibold">
          Register Players for Tournament
        </h1>
        <p className="text-sm text-gray-400">
          Choose an existing player and add them as a participant in this
          tournament.
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
              <label className="text-sm mb-1">Select player</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="border border-gray-700 bg-black px-3 py-2 rounded min-w-[260px]"
              >
                <option value="">-- Choose a player --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Season {p.seasonRating}, {p.tier}
                    {alreadyRegisteredIds.has(p.id) ? ", already joined" : ""})
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
              {submitting ? "Registering..." : "Register Player"}
            </button>
          </div>

          {message && <div className="text-green-400 text-sm">{message}</div>}
          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div>
            <h2 className="text-xl mt-6 mb-3 font-semibold">
              Current Participants
            </h2>
            {participants.length === 0 ? (
              <div className="text-sm text-gray-400">
                No participants registered yet.
              </div>
            ) : (
              <table className="w-full border border-gray-700 text-sm">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-3 py-2 text-left">Player</th>
                    <th className="px-3 py-2 text-left">Join Status</th>
                    <th className="px-3 py-2 text-left">Checked-in</th>
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