"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

type MeUser = {
  id: string
  name: string
}

type Member = {
  id: string
  userId: string
  status: "INVITED" | "APPROVED" | "REJECTED"
  user: { id: string; name: string }
}

type TeamEntry = {
  id: string
  teamName: string
  representativeUserId: string
  status: "PENDING" | "CONFIRMED" | "CANCELED"
  members: Member[]
}

type Category = {
  id: string
  type: string
  gender: string | null
}

export default function TeamEntryPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>
}) {
  const { id: tournamentId, categoryId } = use(params)
  const [me, setMe] = useState<MeUser | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [entry, setEntry] = useState<TeamEntry | null>(null)
  const [teamName, setTeamName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<MeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const base = getBaseUrl()

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [meRes, catRes, entryRes] = await Promise.all([
        fetch(`${base}/api/auth/me`, { cache: "no-store" }),
        fetch(`${base}/api/tournaments/${tournamentId}`, { cache: "no-store" }),
        fetch(`${base}/api/categories/${categoryId}/team-entry`, {
          cache: "no-store",
        }),
      ])
      if (meRes.ok) {
        const data = await meRes.json()
        setMe(data?.user ?? null)
      } else {
        setMe(null)
      }
      if (catRes.ok) {
        const data = await catRes.json()
        const c = data.categories?.find((x: Category) => x.id === categoryId) ?? null
        setCategory(c)
      } else {
        setCategory(null)
      }
      if (entryRes.ok) {
        const e = await entryRes.json().catch(() => null)
        if (e) {
          setEntry(e)
          setTeamName(e.teamName)
        } else {
          setEntry(null)
        }
      } else {
        setEntry(null)
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
  }, [tournamentId, categoryId])

  const isRepresentative = me && entry && entry.representativeUserId === me.id

  const handleCreateEntry = async () => {
    if (!me) return
    const name = teamName.trim()
    if (!name) {
      setError("チーム名を入力してください")
      return
    }
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${base}/api/categories/${categoryId}/team-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "申込みの作成に失敗しました")
      setMessage("団体戦の申込みを作成しました")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "申込みの作成に失敗しました")
    } finally {
      setWorking(false)
    }
  }

  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      return
    }
    setWorking(true)
    setError(null)
    try {
      const res = await fetch(`${base}/api/users/search?q=${encodeURIComponent(q)}`)
      const data = await res.json().catch(() => [])
      if (!res.ok) throw new Error(data?.error ?? "ユーザー検索に失敗しました")
      setSearchResults(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ユーザー検索に失敗しました")
    } finally {
      setWorking(false)
    }
  }

  const handleInvite = async (userId: string) => {
    if (!entry) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${base}/api/team-entries/${entry.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "招待に失敗しました")
      setMessage("メンバーを招待しました")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "招待に失敗しました")
    } finally {
      setWorking(false)
    }
  }

  const handleConfirm = async () => {
    if (!entry) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${base}/api/team-entries/${entry.id}/confirm`, {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "確定に失敗しました")
      setMessage("団体戦エントリーを確定しました")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "確定に失敗しました")
    } finally {
      setWorking(false)
    }
  }

  const handleCancel = async () => {
    if (!entry) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${base}/api/team-entries/${entry.id}/cancel`, {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "取消に失敗しました")
      setMessage("団体戦エントリーを取消しました")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "取消に失敗しました")
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return <div className="p-4 text-gray-400">読み込み中...</div>
  }

  if (!me) {
    return (
      <div className="p-4 space-y-2">
        <p className="text-sm text-gray-400">
          団体戦の申込みにはログインが必要です。
        </p>
        <Link href="/auth/login" className="text-blue-400 hover:underline text-sm">
          ログインページへ
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">団体戦エントリー</h1>
          {category && (
            <p className="text-sm text-gray-400 mt-1">
              種目: {category.gender ?? ""} {category.type}
            </p>
          )}
        </div>
        <Link
          href={`/tournaments/${tournamentId}/register`}
          className="text-sm text-blue-400 hover:underline"
        >
          ← 大会参加登録に戻る
        </Link>
      </div>

      {message && <div className="text-green-400 text-sm">{message}</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      {!entry ? (
        <section className="border border-gray-700 rounded p-4 space-y-3 max-w-xl text-sm">
          <h2 className="font-semibold text-base mb-1">1. チーム申込みを作成</h2>
          <p className="text-gray-400 text-xs mb-2">
            代表者としてチーム名を入力し、団体戦への申込みを作成します。
          </p>
          <div className="space-y-2">
            <label className="block text-xs text-gray-300 mb-1">チーム名</label>
            <input
              type="text"
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="例: ピンポンマップAチーム"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateEntry}
            disabled={working}
            className="mt-3 border border-blue-600 text-blue-300 px-4 py-2 rounded hover:bg-blue-900/30 disabled:opacity-50"
          >
            {working ? "作成中..." : "団体戦に申込み"}
          </button>
        </section>
      ) : (
        <section className="border border-gray-700 rounded p-4 space-y-4 max-w-2xl text-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-base">あなたのチーム</h2>
              <p className="text-gray-300 mt-1">
                チーム名: <span className="font-medium">{entry.teamName}</span>
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                ステータス: {entry.status === "PENDING" ? "申請中" : entry.status === "CONFIRMED" ? "確定" : "取消済み"}
              </p>
            </div>
            {isRepresentative && entry.status === "PENDING" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={working}
                  className="border border-green-600 text-green-300 px-3 py-1 rounded hover:bg-green-900/40 disabled:opacity-50 text-xs"
                >
                  {working ? "処理中..." : "エントリー確定"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={working}
                  className="border border-red-600 text-red-300 px-3 py-1 rounded hover:bg-red-900/40 disabled:opacity-50 text-xs"
                >
                  {working ? "処理中..." : "申込み取消"}
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">メンバー一覧</h3>
              <ul className="border border-gray-700 rounded divide-y divide-gray-800">
                <li className="px-3 py-2 flex items-center justify-between">
                  <span>{me.name}（代表者）</span>
                  <span className="text-xs text-gray-400">APPROVED</span>
                </li>
                {entry.members.map((m) => (
                  <li key={m.id} className="px-3 py-2 flex items-center justify-between">
                    <span>{m.user.name}</span>
                    <span className="text-xs text-gray-400">
                      {m.status === "INVITED"
                        ? "招待中"
                        : m.status === "APPROVED"
                        ? "承認済み"
                        : "拒否"}
                    </span>
                  </li>
                ))}
                {entry.members.length === 0 && (
                  <li className="px-3 py-2 text-xs text-gray-500">
                    まだメンバーがいません。右側から招待してください。
                  </li>
                )}
              </ul>
            </div>

            {isRepresentative && entry.status === "PENDING" && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">メンバーを招待</h3>
                <p className="text-xs text-gray-400">
                  名前・メールアドレス・電話番号で検索し、メンバー候補を追加できます。
                  招待には大会への参加登録（支払い完了）が必要です。
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 border border-gray-700 bg-black px-3 py-2 rounded text-sm"
                    placeholder="例: 田中 / tanaka@example.com / 080..."
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={working}
                    className="border border-gray-700 px-3 py-2 rounded hover:bg-gray-900 disabled:opacity-50 text-sm"
                  >
                    検索
                  </button>
                </div>
                <ul className="border border-gray-700 rounded divide-y divide-gray-800 max-h-64 overflow-auto text-sm">
                  {searchResults.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-gray-500">
                      検索結果がここに表示されます。
                    </li>
                  ) : (
                    searchResults.map((u) => (
                      <li key={u.id} className="px-3 py-2 flex items-center justify-between gap-2">
                        <span>{u.name}</span>
                        <button
                          type="button"
                          onClick={() => handleInvite(u.id)}
                          disabled={working}
                          className="border border-blue-600 text-blue-300 px-2 py-1 rounded hover:bg-blue-900/40 disabled:opacity-50 text-xs"
                        >
                          招待
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

