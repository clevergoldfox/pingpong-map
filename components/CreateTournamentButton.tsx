"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { getBaseUrl } from "@/lib/base-url"

export function CreateTournamentButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${getBaseUrl()}/api/tournaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "新規大会",
          location: "",
          startDate: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "大会の作成に失敗しました")
      router.push(`/tournaments/${data.id}/edit`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "大会の作成に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="border border-gray-600 bg-gray-800 px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? "作成中..." : "大会を作成"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
