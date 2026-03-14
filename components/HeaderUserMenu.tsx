"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

type MeUser = {
  id: string
  name: string
  role: "ADMIN" | "ORGANIZER" | "PLAYER" | string
}

export function HeaderUserMenu() {
  const [user, setUser] = useState<MeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${getBaseUrl()}/api/auth/me`, {
          cache: "no-store",
        })
        if (!res.ok) {
          return
        }
        const data = await res.json().catch(() => ({}))
        if (!cancelled) {
          setUser(data?.user ?? null)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "ログイン状態の取得に失敗しました"
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/logout`, {
        method: "POST",
      })
      if (res.ok) {
        setUser(null)
        // 最低限のリフレッシュ
        window.location.href = "/"
      }
    } catch {
      // ignore
    }
  }

  if (loading && !user) {
    return <div className="text-xs text-gray-500 ml-auto">読み込み中...</div>
  }

  if (!user) {
    return (
      <div className="ml-auto flex items-center gap-3 text-sm">
        <Link href="/auth/login" className="hover:text-blue-400">
          ログイン
        </Link>
        <Link href="/auth/register" className="hover:text-blue-400">
          新規登録
        </Link>
        {error && (
          <span className="text-xs text-red-400 hidden sm:inline">
            {error}
          </span>
        )}
      </div>
    )
  }

  const roleLabel =
    user.role === "ADMIN"
      ? "管理者"
      : user.role === "ORGANIZER"
        ? "主催者"
        : "プレイヤー"

  return (
    <div className="ml-auto flex items-center gap-3 text-sm">
      <span className="text-gray-300">
        ログイン中: <span className="font-semibold">{user.name}</span>{" "}
        <span className="text-xs text-gray-400">({roleLabel})</span>
      </span>
      <button
        type="button"
        onClick={handleLogout}
        className="border border-gray-600 px-2 py-1 rounded text-xs hover:bg-gray-800"
      >
        ログアウト
      </button>
    </div>
  )
}

