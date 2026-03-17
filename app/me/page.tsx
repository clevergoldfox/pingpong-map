"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

type MeUser = { id: string; name: string; role: string }

type MeProfile = {
  id: string
  name: string
  email: string
  role: string
  rating: number
  seasonRating: number
  tier: string
  avatarUrl: string | null
  playStyle: string | null
  affiliation: string | null
}

type MyTournament = {
  id: string
  tournamentId: string
  joinStatus: string
  joinStatusLabel: string
  checkedIn: boolean
  joinedAt: string
  canceledAt: string | null
  tournament: {
    id: string
    name: string
    location: string
    status: string
    startDate: string
    mapUrl: string | null
  }
}

type PlayerSummary = {
  id: string
  matchCount: number
  wins: number
  losses: number
}

type Invitation = {
  id: string
  status: "INVITED" | "APPROVED" | "REJECTED" | string
  invitedAt: string
  respondedAt: string | null
  teamEntry: {
    id: string
    representative: { id: string; name: string }
    tournament: { id: string; name: string }
    category: { id: string; type: string; gender: string | null }
  }
}

const PLAY_STYLE_LABEL: Record<string, string> = {
  SHAKE_ATTACK: "シェーク（攻撃）",
  PEN_ATTACK: "ペン（攻撃）",
  CUTTER: "カット",
  BLOCKER: "ブロック",
  OTHER: "その他",
}

const CATEGORY_GENDER_LABEL: Record<string, string> = {
  MALE: "男子",
  FEMALE: "女子",
  MIXED: "混成",
  MIX: "ミックス",
}

const CATEGORY_TYPE_LABEL: Record<string, string> = {
  SINGLES: "シングルス",
  DOUBLES: "ダブルス",
  TEAM: "団体",
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
}

function initials(name: string) {
  const s = (name ?? "").trim()
  if (!s) return "?"
  return s.slice(0, 1).toUpperCase()
}

export default function MePage() {
  const base = getBaseUrl()
  const [me, setMe] = useState<MeUser | null>(null)
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [tournaments, setTournaments] = useState<MyTournament[]>([])
  const [summary, setSummary] = useState<PlayerSummary | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formName, setFormName] = useState("")
  const [formAvatarUrl, setFormAvatarUrl] = useState("")
  const [formPlayStyle, setFormPlayStyle] = useState<string>("")
  const [formAffiliation, setFormAffiliation] = useState("")

  const avatarSrc = useMemo(() => {
    const url = (profile?.avatarUrl ?? "").trim()
    return url.length ? url : null
  }, [profile?.avatarUrl])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const meRes = await fetch(`${base}/api/auth/me`, { cache: "no-store" })
        const meData = await meRes.json().catch(() => ({}))
        const meUser: MeUser | null = meData?.user ?? null
        if (!meUser) {
          // middleware should redirect, but keep a safe fallback
          window.location.href = `/auth/login?redirect=${encodeURIComponent("/me")}`
          return
        }
        if (cancelled) return
        setMe(meUser)

        const [profileRes, tournamentsRes, invitationsRes, summaryRes] = await Promise.all([
          fetch(`${base}/api/me/profile`, { cache: "no-store" }),
          fetch(`${base}/api/me/tournaments`, { cache: "no-store" }),
          fetch(`${base}/api/invitations`, { cache: "no-store" }),
          fetch(`${base}/api/players/${meUser.id}`, { cache: "no-store" }),
        ])

        if (cancelled) return

        const profileData = profileRes.ok ? await profileRes.json() : null
        const tournamentsData = tournamentsRes.ok ? await tournamentsRes.json() : []
        const invitationsData = invitationsRes.ok ? await invitationsRes.json() : []
        const summaryData = summaryRes.ok ? await summaryRes.json() : null

        setProfile(profileData)
        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : [])
        setInvitations(Array.isArray(invitationsData) ? invitationsData : [])
        setSummary(summaryData)

        setFormName(profileData?.name ?? meUser.name)
        setFormAvatarUrl(profileData?.avatarUrl ?? "")
        setFormPlayStyle(profileData?.playStyle ?? "")
        setFormAffiliation(profileData?.affiliation ?? "")
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "読み込みに失敗しました")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [base])

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${base}/api/me/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          avatarUrl: formAvatarUrl,
          playStyle: formPlayStyle || null,
          affiliation: formAffiliation,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "保存に失敗しました")
      setProfile(data)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-400">読み込み中...</div>
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-red-400 text-sm">{error}</div>
        <button
          type="button"
          className="border border-gray-700 rounded px-3 py-2 text-sm hover:bg-gray-800/50"
          onClick={() => window.location.reload()}
        >
          再読み込み
        </button>
      </div>
    )
  }

  if (!me || !profile) {
    return <div className="text-gray-400">ユーザー情報が取得できませんでした。</div>
  }

  const playStyleLabel = profile.playStyle ? (PLAY_STYLE_LABEL[profile.playStyle] ?? profile.playStyle) : "未設定"

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">マイページ</h1>
          <p className="text-sm text-gray-400">プロフィールと活動情報</p>
        </div>
        <Link href={`/players/${profile.id}`} className="text-sm text-blue-400 hover:underline">
          公開プロフィールを見る
        </Link>
      </div>

      <section className="border border-gray-700 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt="avatar"
                className="w-16 h-16 rounded-full object-cover border border-gray-700"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-lg font-semibold text-gray-300">
                {initials(profile.name)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xl font-semibold truncate">{profile.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  戦型: <span className="text-gray-200">{playStyleLabel}</span>
                  {profile.affiliation ? (
                    <span className="ml-2">／ 所属: <span className="text-gray-200">{profile.affiliation}</span></span>
                  ) : (
                    <span className="ml-2">／ 所属: <span className="text-gray-500">未設定</span></span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="border border-gray-700 rounded px-3 py-2 text-sm hover:bg-gray-800/50"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? "閉じる" : "編集"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
              <div className="border border-gray-800 rounded p-3">
                <div className="text-gray-400 text-xs">レーティング</div>
                <div className="font-semibold text-lg">{profile.seasonRating}</div>
              </div>
              <div className="border border-gray-800 rounded p-3">
                <div className="text-gray-400 text-xs">生涯</div>
                <div className="font-semibold text-lg">{profile.rating}</div>
              </div>
              <div className="border border-gray-800 rounded p-3">
                <div className="text-gray-400 text-xs">ティア</div>
                <div className="font-semibold text-lg">{profile.tier}</div>
              </div>
            </div>

            {editing && (
              <div className="mt-4 border-t border-gray-800 pt-4">
                <div className="grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-400">名前</span>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="bg-transparent border border-gray-700 rounded px-3 py-2 text-sm"
                      placeholder="名前"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs text-gray-400">アイコン画像URL</span>
                    <input
                      value={formAvatarUrl}
                      onChange={(e) => setFormAvatarUrl(e.target.value)}
                      className="bg-transparent border border-gray-700 rounded px-3 py-2 text-sm"
                      placeholder="https://..."
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs text-gray-400">戦型</span>
                    <select
                      value={formPlayStyle}
                      onChange={(e) => setFormPlayStyle(e.target.value)}
                      className="bg-transparent border border-gray-700 rounded px-3 py-2 text-sm"
                    >
                      <option value="">未設定</option>
                      {Object.entries(PLAY_STYLE_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs text-gray-400">所属（任意）</span>
                    <input
                      value={formAffiliation}
                      onChange={(e) => setFormAffiliation(e.target.value)}
                      className="bg-transparent border border-gray-700 rounded px-3 py-2 text-sm"
                      placeholder="例: 渋谷クラブ"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="border border-green-600 text-green-300 px-4 py-2 rounded hover:bg-green-900/30 disabled:opacity-50 text-sm"
                    >
                      {saving ? "保存中..." : "保存"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false)
                        setFormName(profile.name)
                        setFormAvatarUrl(profile.avatarUrl ?? "")
                        setFormPlayStyle(profile.playStyle ?? "")
                        setFormAffiliation(profile.affiliation ?? "")
                      }}
                      className="border border-gray-700 rounded px-4 py-2 text-sm hover:bg-gray-800/50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border border-gray-700 rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-3">参加予定大会</h2>
        {tournaments.length === 0 ? (
          <div className="text-sm text-gray-400">参加予定の大会はありません</div>
        ) : (
          <ul className="space-y-3">
            {tournaments.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/tournaments/${p.tournament.id}`}
                  className="block border border-gray-800 rounded-lg p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.tournament.name}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {formatDate(p.tournament.startDate)} ／ {p.tournament.location}
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300">
                      {p.joinStatusLabel}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-gray-700 rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-3">戦績サマリー</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="border border-gray-800 rounded p-3">
            <div className="text-gray-400 text-xs">総試合数</div>
            <div className="font-semibold text-lg">{summary?.matchCount ?? 0}</div>
          </div>
          <div className="border border-gray-800 rounded p-3">
            <div className="text-gray-400 text-xs">勝ち</div>
            <div className="font-semibold text-lg">{summary?.wins ?? 0}</div>
          </div>
          <div className="border border-gray-800 rounded p-3">
            <div className="text-gray-400 text-xs">負け</div>
            <div className="font-semibold text-lg">{summary?.losses ?? 0}</div>
          </div>
        </div>
      </section>

      <section className="border border-gray-700 rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-3">通知（団体招待）</h2>
        {invitations.length === 0 ? (
          <div className="text-sm text-gray-400">通知はありません</div>
        ) : (
          <ul className="space-y-3">
            {invitations.map((inv) => {
              const g = CATEGORY_GENDER_LABEL[String(inv.teamEntry.category.gender ?? "")] ?? ""
              const t = CATEGORY_TYPE_LABEL[String(inv.teamEntry.category.type ?? "")] ?? inv.teamEntry.category.type
              const cat = `${g}${t}`.trim() || t
              const statusLabel =
                inv.status === "INVITED" ? "招待中" : inv.status === "APPROVED" ? "承認" : inv.status === "REJECTED" ? "辞退" : inv.status
              return (
                <li key={inv.id} className="border border-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{inv.teamEntry.tournament.name}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {cat} ／ 代表: {inv.teamEntry.representative.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">招待日: {formatDate(inv.invitedAt)}</div>
                    </div>
                    <span className="shrink-0 inline-flex items-center text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300">
                      {statusLabel}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

