"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

type Invitation = {
  id: string
  status: "INVITED" | "APPROVED" | "REJECTED"
  teamEntry: {
    id: string
    teamName: string
    category: { id: string; type: string; gender: string | null }
    tournament: { id: string; name: string }
    representative: { id: string; name: string }
  }
}

type MeUser = { id: string; name: string }

export default function InvitationsPage() {
  const [me, setMe] = useState<MeUser | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const base = getBaseUrl()

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [meRes, listRes] = await Promise.all([
        fetch(`${base}/api/auth/me`, { cache: "no-store" }),
        fetch(`${base}/api/invitations`, { cache: "no-store" }).catch(() => null),
      ])
      if (meRes.ok) {
        const data = await meRes.json()
        setMe(data?.user ?? null)
      } else {
        setMe(null)
      }
      if (listRes && listRes.ok) {
        const data = await listRes.json().catch(() => [])
        setInvitations(data)
      } else {
        setInvitations([])
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setWorkingId(id)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${base}/api/team-entry-members/${id}/${action}`, {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "操作に失敗しました")
      setMessage(action === "approve" ? "招待を承認しました" : "招待を拒否しました")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "操作に失敗しました")
    } finally {
      setWorkingId(null)
    }
  }

  if (loading) {
    return <div className="p-4 text-gray-400">読み込み中...</div>
  }

  if (!me) {
    return (
      <div className="p-4 space-y-2 text-sm">
        <p className="text-gray-400">招待を確認するにはログインが必要です。</p>
        <Link href="/auth/login" className="text-blue-400 hover:underline">
          ログインページへ
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">団体戦の招待</h1>
        <Link href="/" className="text-sm text-blue-400 hover:underline">
          ← トップへ戻る
        </Link>
      </div>

      {message && <div className="text-green-400 text-sm">{message}</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      {invitations.length === 0 ? (
        <p className="text-sm text-gray-400">現在、団体戦の招待はありません。</p>
      ) : (
        <ul className="border border-gray-700 rounded divide-y divide-gray-800 text-sm">
          {invitations.map((inv) => (
            <li key={inv.id} className="px-3 py-3 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[220px]">
                <div className="font-medium">
                  {inv.teamEntry.teamName}
                  <span className="text-xs text-gray-400 ml-2">
                    （{inv.teamEntry.tournament.name} / {inv.teamEntry.category.gender ?? ""} {inv.teamEntry.category.type}）
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  代表者: {inv.teamEntry.representative.name}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  ステータス:{" "}
                  {inv.status === "INVITED"
                    ? "招待中"
                    : inv.status === "APPROVED"
                    ? "承認済み"
                    : "拒否"}
                </div>
              </div>
              {inv.status === "INVITED" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction(inv.id, "approve")}
                    disabled={workingId === inv.id}
                    className="border border-green-600 text-green-300 px-3 py-1 rounded text-xs hover:bg-green-900/40 disabled:opacity-50"
                  >
                    {workingId === inv.id ? "処理中..." : "承認"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(inv.id, "reject")}
                    disabled={workingId === inv.id}
                    className="border border-red-600 text-red-300 px-3 py-1 rounded text-xs hover:bg-red-900/40 disabled:opacity-50"
                  >
                    {workingId === inv.id ? "処理中..." : "拒否"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

