"use client"

import { useState } from "react"
import { getBaseUrl } from "@/lib/base-url"

const STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "CHECKIN",
  "STARTED",
  "FINISHED",
  "ARCHIVED",
] as const

type TournamentStatus = (typeof STATUSES)[number]

export function TournamentStatusControls({
  tournamentId,
  initialStatus,
}: {
  tournamentId: string
  initialStatus: TournamentStatus
}) {
  const [status, setStatus] = useState<TournamentStatus>(initialStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setMessage(null)

      const res = await fetch(
        `${getBaseUrl()}/api/tournaments/${tournamentId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      )

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.error ?? "ステータスの更新に失敗しました")
      }

      setMessage("ステータスを更新しました")
    } catch (e: any) {
      setError(e.message ?? "ステータスの更新に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 text-sm">
      <div className="flex gap-2 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TournamentStatus)}
          className="border border-gray-700 bg-black px-2 py-1 rounded text-xs md:text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
        >
          {saving ? "保存中..." : "ステータスを更新"}
        </button>
      </div>
      {message && <div className="text-green-400 text-xs">{message}</div>}
      {error && <div className="text-red-400 text-xs">{error}</div>}
    </div>
  )
}


