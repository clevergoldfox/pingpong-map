"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

type SeasonInfo = {
  season?: string
}

export default function AdminPage(){
  const [activeSeason, setActiveSeason] = useState<string | null>(null)
  const [seasonName, setSeasonName] = useState("")
  const [durationDays, setDurationDays] = useState("90")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const loadSeason = async () => {
      try {
        const res = await fetch(`${getBaseUrl()}/api/leaderboard/season`, {
          cache: "no-store",
        })
        const data: SeasonInfo | { error: string } = await res.json()
        if (res.ok && "season" in data) {
          setActiveSeason(data.season ?? null)
        } else {
          setActiveSeason(null)
        }
      } catch {
        setActiveSeason(null)
      }
    }

    loadSeason()
  }, [])

  const startSeason = async () => {
    try {
      setBusy(true)
      setMessage(null)
      setError(null)

      const body: { name?: string; durationDays?: number } = {}
      if (seasonName.trim()) body.name = seasonName.trim()
      if (durationDays.trim()) {
        const d = Number(durationDays)
        if (!Number.isNaN(d)) body.durationDays = d
      }

      const res = await fetch(`${getBaseUrl()}/api/seasons/start-new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to start season")
      }

      setMessage("New season started")
      setActiveSeason(data.season?.name ?? body.name ?? null)
    } catch (e: any) {
      setError(e.message ?? "Failed to start season")
    } finally {
      setBusy(false)
    }
  }

  return(
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Admin Panel
      </h1>

      <section className="border border-gray-800 rounded p-4 space-y-3">
        <h2 className="text-xl font-semibold">Season control</h2>
        <div className="text-sm text-gray-400">
          Active season:{" "}
          {activeSeason ? activeSeason : "No active season"}
        </div>

        <div className="grid gap-3 md:grid-cols-3 text-sm mt-2">
          <div className="flex flex-col gap-1">
            <label>Season name (optional)</label>
            <input
              className="border border-gray-700 bg-black px-3 py-2 rounded"
              value={seasonName}
              onChange={(e) => setSeasonName(e.target.value)}
              placeholder="e.g. Spring 2026"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label>Duration (days)</label>
            <input
              className="border border-gray-700 bg-black px-3 py-2 rounded"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="90"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={startSeason}
          disabled={busy}
          className="mt-3 border border-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-900 disabled:opacity-50"
        >
          {busy ? "Starting..." : "Start new season"}
        </button>

        {message && <div className="text-green-400 text-sm">{message}</div>}
        {error && <div className="text-red-400 text-sm">{error}</div>}
      </section>

      <section className="border border-gray-800 rounded p-4 space-y-3 text-sm">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tournaments"
            className="border border-gray-700 px-4 py-2 rounded hover:bg-gray-900"
          >
            Manage tournaments
          </Link>
          <Link
            href="/leaderboard"
            className="border border-gray-700 px-4 py-2 rounded hover:bg-gray-900"
          >
            View leaderboard
          </Link>
          <Link
            href="/players"
            className="border border-gray-700 px-4 py-2 rounded hover:bg-gray-900"
          >
            View players
          </Link>
        </div>
      </section>
    </div>
  )
}