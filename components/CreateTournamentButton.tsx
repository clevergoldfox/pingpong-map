"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getBaseUrl } from "@/lib/base-url"

type MeUser = {
  id: string
  name: string
  role: "ADMIN" | "ORGANIZER" | "PLAYER" | string
}

export function CreateTournamentButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<MeUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setChecking(true)
        const res = await fetch(`${getBaseUrl()}/api/auth/me`, {
          cache: "no-store",
        })
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        if (!cancelled) setMe(data?.user ?? null)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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

  const canCreate =
    me && (me.role === "ADMIN" || me.role === "ORGANIZER")

  return (
    <div className="mb-6 space-y-1 text-sm">
      {canCreate ? (
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="border border-gray-600 bg-gray-800 px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "作成中..." : "大会を作成"}
        </button>
      ) : (
        <p className="text-gray-400">
          大会の作成は主催者・管理者のみ利用できます。ログインすると権限に応じてボタンが表示されます。
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      {checking && !me && (
        <p className="text-xs text-gray-500">権限を確認しています...</p>
      )}
    </div>
  )
}
