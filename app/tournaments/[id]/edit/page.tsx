"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

type Category = {
  id: string
  type: string
  format: string
  gender: string | null
  leagueMode: string | null
  fullLeaguePlayerCount: number | null
  selectLeagueMatchCount: number | null
  tablesPerMatch: number | null
  capacity: number | null
  minEntries: number | null
  courtRange: string | null
  refereeRequired: boolean
  entryFeeCard: number | null
  entryFeeCash: number | null
  roundCount: number | null
  currentRound: number
  isLocked: boolean
  teamMatchStructure?: Array<{ order: number; type: string }> | null
}

type Tournament = {
  id: string
  name: string
  location: string
  status: string
  startDate: string
  mapUrl: string | null
  openAt: string | null
  entryDeadlineAt: string | null
  cancelPolicy: string | null
  organizer: string | null
  sponsor: string | null
  description: string | null
  categories: Category[]
}

const STEPS = [
  { id: 2, label: "大会要項" },
  { id: 3, label: "種目作成" },
  { id: 4, label: "公開" },
] as const

const GENDER_LABEL: Record<string, string> = {
  MALE: "男子",
  FEMALE: "女子",
  MIXED: "混成",
  MIX: "ミックス",
}
const TYPE_LABEL: Record<string, string> = {
  SINGLES: "シングルス",
  DOUBLES: "ダブルス",
  TEAM: "団体",
}
function getCategoryDisplayName(c: { gender: string | null; type: string }): string {
  const g = GENDER_LABEL[c.gender ?? ""] ?? c.gender ?? "—"
  const t = TYPE_LABEL[c.type] ?? c.type
  return `${g}${t}`
}

export default function TournamentEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: tournamentId } = use(params)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(2)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadTournament = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${getBaseUrl()}/api/tournaments/${tournamentId}`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "読み込みに失敗しました")
      setTournament(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTournament()
  }, [tournamentId])

  if (loading || !tournament) {
    return (
      <div className="p-6">
        {error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <p className="text-gray-400">読み込み中...</p>
        )}
      </div>
    )
  }

  if (tournament.status !== "DRAFT") {
    return (
      <div className="p-6 space-y-4">
        <p className="text-gray-400">
          この大会は下書きではないため、編集ウィザードでは変更できません。ステータス: {tournament.status}
        </p>
        <Link
          href={`/tournaments/${tournamentId}`}
          className="text-blue-400 hover:underline"
        >
          大会詳細へ戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">大会作成・編集</h1>
        <Link
          href={`/tournaments/${tournamentId}`}
          className="text-sm text-gray-400 hover:text-white"
        >
          大会詳細へ
        </Link>
      </div>

      {/* Step tabs */}
      <nav className="flex gap-2 border-b border-gray-700 pb-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={`px-4 py-2 rounded-t text-sm ${
              step === s.id
                ? "bg-gray-800 border border-gray-700 border-b-0 -mb-px"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {s.id}. {s.label}
          </button>
        ))}
      </nav>

      {message && (
        <div className="text-green-400 text-sm">{message}</div>
      )}
      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      {step === 2 && (
        <Step2TournamentDetails
          tournament={tournament}
          onSaved={() => {
            setMessage("保存しました")
            loadTournament()
          }}
          onError={setError}
          setSaving={setSaving}
          saving={saving}
        />
      )}
      {step === 3 && (
        <Step3Categories
          tournamentId={tournamentId}
          categories={tournament.categories}
          onSaved={() => {
            setMessage("種目を追加しました")
            loadTournament()
          }}
          onError={setError}
        />
      )}
      {step === 4 && (
        <Step4Publish
          tournament={tournament}
          onPublished={() => {
            setMessage("公開しました")
            loadTournament()
          }}
          onError={setError}
          setSaving={setSaving}
          saving={saving}
        />
      )}
    </div>
  )
}

function Step2TournamentDetails({
  tournament,
  onSaved,
  onError,
  setSaving,
  saving,
}: {
  tournament: Tournament
  onSaved: () => void
  onError: (s: string | null) => void
  setSaving: (b: boolean) => void
  saving: boolean
}) {
  const asDateOnly = (iso: string | null | undefined) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }

  const dateOnlyToIsoStart = (dateOnly: string) => {
    return dateOnly ? `${dateOnly}T00:00:00` : null
  }

  const isoToDatetimeLocal = (iso: string | null | undefined): string => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const min = String(d.getMinutes()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  const datetimeLocalToIso = (v: string) => {
    if (!v || !v.trim()) return null
    if (v.length >= 16 && v.includes("T")) return `${v.slice(0, 16)}:00`
    return dateOnlyToIsoStart(v.slice(0, 10))
  }

  const openNativeDatePicker = (el: HTMLInputElement | null) => {
    if (!el) return
    try {
      // Chrome/Edge: opens native calendar UI, requires user gesture.
      el.showPicker?.()
    } catch {
      // ignore: some browsers throw if not allowed
    }
    el.focus()
  }

  const [form, setForm] = useState({
    name: tournament.name,
    location: tournament.location,
    // 開催日: 日付のみ（YYYY-MM-DD）
    startDate: tournament.startDate?.slice(0, 10) || "",
    mapUrl: tournament.mapUrl || "",
    // 開場時間: 時間のみ（HH:MM）
    openAt: tournament.openAt ? (() => {
      const d = new Date(tournament.openAt)
      if (Number.isNaN(d.getTime())) return ""
      const hh = String(d.getHours()).padStart(2, "0")
      const min = String(d.getMinutes()).padStart(2, "0")
      return `${hh}:${min}`
    })() : "",
    // 申込み締切日時: datetime-local 形式（既存値のまま）
    entryDeadlineAt: tournament.entryDeadlineAt ? (tournament.entryDeadlineAt.slice(0, 16) || asDateOnly(tournament.entryDeadlineAt) + "T23:59") : "",
    cancelPolicy:
      tournament.cancelPolicy ||
      "大会○日前以降のキャンセルは、参加費の100%をキャンセル料として頂戴します。\n※無断キャンセルの場合は参加費100％を請求いたします。\nまた、今後の大会参加をお断りする場合がございますのでご注意ください。",
    organizer: tournament.organizer || "",
    sponsor: tournament.sponsor || "",
    description:
      tournament.description ||
      "【参加資格】\nどなたでもご参加いただけます。\n\n【種目】\n混成団体\n\n【ルール】\n①W ②S ③S の2点先取（1チーム3〜4人）の団体戦。\n○〜○チームでリーグ戦を行います。\n※1番（ダブルス）に出た選手は2番(シングルス)には出場できません。\n※女子のみ、男子のみのチームも参加可能です。\n\n【表彰】\n各グループ優勝チーム\n\n【その他】\nNittaku プラ 3スタープレミアム",
  })

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: tournament.name,
      location: tournament.location,
      startDate: tournament.startDate?.slice(0, 10) || "",
      mapUrl: tournament.mapUrl || "",
      openAt: tournament.openAt ? (() => {
        const d = new Date(tournament.openAt)
        if (Number.isNaN(d.getTime())) return ""
        const hh = String(d.getHours()).padStart(2, "0")
        const min = String(d.getMinutes()).padStart(2, "0")
        return `${hh}:${min}`
      })() : "",
      entryDeadlineAt: tournament.entryDeadlineAt ? (tournament.entryDeadlineAt.slice(0, 16) || asDateOnly(tournament.entryDeadlineAt) + "T23:59") : "",
      cancelPolicy:
        tournament.cancelPolicy ||
        prev.cancelPolicy ||
        "大会○日前以降のキャンセルは、参加費の100%をキャンセル料として頂戴します。\n※無断キャンセルの場合は参加費100％を請求いたします。\nまた、今後の大会参加をお断りする場合がございますのでご注意ください。",
      organizer: tournament.organizer || prev.organizer,
      sponsor: tournament.sponsor || "",
      description:
        tournament.description ||
        prev.description ||
        "【参加資格】\nどなたでもご参加いただけます。\n\n【種目】\n混成団体\n\n【ルール】\n①W ②S ③S の2点先取（1チーム3〜4人）の団体戦。\n○〜○チームでリーグ戦を行います。\n※1番（ダブルス）に出た選手は2番(シングルス)には出場できません。\n※女子のみ、男子のみのチームも参加可能です。\n\n【表彰】\n各グループ優勝チーム\n\n【その他】\nNittaku プラ 3スタープレミアム",
    }))
  }, [tournament.id, tournament.name, tournament.location, tournament.startDate, tournament.mapUrl, tournament.openAt, tournament.entryDeadlineAt, tournament.cancelPolicy, tournament.organizer, tournament.sponsor, tournament.description])

  useEffect(() => {
    if (form.organizer.trim()) return
    let cancelled = false
    fetch(`${getBaseUrl()}/api/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.name) return
        setForm((prev) => ({ ...prev, organizer: prev.organizer || data.name }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onError(null)
    setSaving(true)
    try {
      const res = await fetch(
        `${getBaseUrl()}/api/tournaments/${tournament.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            location: form.location,
            // 開催日: 日付のみをISOへ
            startDate: form.startDate ? dateOnlyToIsoStart(form.startDate) : undefined,
            mapUrl: form.mapUrl || null,
            // 開場時間: 時刻のみを仮の日付と合わせて保存（ここでは 1970-01-01）
            openAt: form.openAt
              ? `${"1970-01-01"}T${form.openAt.length === 5 ? `${form.openAt}:00` : form.openAt}`
              : null,
            entryDeadlineAt: datetimeLocalToIso(form.entryDeadlineAt),
            cancelPolicy: form.cancelPolicy || null,
            organizer: form.organizer || null,
            sponsor: form.sponsor || null,
            description: form.description || null,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "保存に失敗しました")
      onSaved()
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">② 大会要項</h2>
      <div className="grid gap-3 text-sm">
        <div>
          <label className="block mb-1">大会名 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block mb-1">開催日 *</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, startDate: e.target.value }))
            }
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block mb-1">会場場所 *</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block mb-1">地図 URL（Google Map 等）</label>
          <input
            type="url"
            value={form.mapUrl}
            onChange={(e) => setForm((f) => ({ ...f, mapUrl: e.target.value }))}
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block mb-1">開場時間</label>
          <input
            id="openAt"
            type="time"
            value={form.openAt}
            onChange={(e) =>
              setForm((f) => ({ ...f, openAt: e.target.value }))
            }
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1">申込み締切日時</label>
          <input
            id="entryDeadlineAt"
            type="datetime-local"
            value={form.entryDeadlineAt}
            onChange={(e) =>
              setForm((f) => ({ ...f, entryDeadlineAt: e.target.value }))
            }
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1">キャンセルポリシー</label>
          <textarea
            value={form.cancelPolicy}
            onChange={(e) =>
              setForm((f) => ({ ...f, cancelPolicy: e.target.value }))
            }
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded min-h-[80px]"
          />
        </div>
        <div>
          <label className="block mb-1">主催団体</label>
          <input
            type="text"
            value={form.organizer}
            onChange={(e) =>
              setForm((f) => ({ ...f, organizer: e.target.value }))
            }
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            placeholder="ログイン中の名前が自動で入ります"
          />
        </div>
        <div>
          <label className="block mb-1">協賛団体</label>
          <textarea
            value={form.sponsor}
            onChange={(e) => setForm((f) => ({ ...f, sponsor: e.target.value }))}
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded min-h-[60px]"
            placeholder="1行に1団体ずつ入力"
          />
        </div>
        <div>
          <label className="block mb-1">大会説明/注意事項</label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded min-h-[120px]"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="border border-gray-600 px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存して次へ"}
      </button>
    </form>
  )
}

function Step3Categories({
  tournamentId,
  categories,
  onSaved,
  onError,
}: {
  tournamentId: string
  categories: Category[]
  onSaved: () => void
  onError: (s: string | null) => void
}) {
  const [gender, setGender] = useState("MALE")
  const [type, setType] = useState("SINGLES")
  const [format, setFormat] = useState("ROUND_ROBIN")
  const isMix = gender === "MIX"
  const [leagueMode, setLeagueMode] = useState<"FULL" | "SELECT">("FULL")
  const [fullLeaguePlayerCount, setFullLeaguePlayerCount] = useState(5)
  const [selectLeagueMatchCount, setSelectLeagueMatchCount] = useState(5)
  const [teamSlots, setTeamSlots] = useState<Array<{ order: number; type: "SINGLES" | "DOUBLES" }>>([
    { order: 1, type: "SINGLES" },
  ])
  const [tablesPerMatch, setTablesPerMatch] = useState(1)
  const [capacity, setCapacity] = useState("")
  const [minEntries, setMinEntries] = useState("")
  const [courtStart, setCourtStart] = useState("")
  const [courtEnd, setCourtEnd] = useState("")
  const [ageRestrictionEnabled, setAgeRestrictionEnabled] = useState(false)
  const [ageMin, setAgeMin] = useState("")
  const [ageMax, setAgeMax] = useState("")
  const [ratingRestrictionEnabled, setRatingRestrictionEnabled] = useState(false)
  const [ratingMin, setRatingMin] = useState("")
  const [ratingMax, setRatingMax] = useState("")
  const [refereeRequired, setRefereeRequired] = useState(true)
  // シングルス・ダブルス=審判あり、団体=なしをデフォルトにするため type 変更時に更新
  const setTypeWithRefereeDefault = (t: string) => {
    setType(t)
    setRefereeRequired(t !== "TEAM")
  }
  const [entryFeeCard, setEntryFeeCard] = useState("")
  const [entryFeeCash, setEntryFeeCash] = useState("")
  const [roundCount, setRoundCount] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)

  const isLeague = format === "ROUND_ROBIN" || format === "SELECT_ROUND"
  const isGroupToTournament = format === "GROUP_TO_TOURNAMENT"
  const isTeam = type === "TEAM"
  const [groupToLeagueMode, setGroupToLeagueMode] = useState<"FULL" | "SELECT">("FULL")
  const [groupToAdvance, setGroupToAdvance] = useState<"TOP_1" | "TOP_2" | "TOP_3" | "ALL">("TOP_1")

  const editingCategory = editingCategoryId ? categories.find((c) => c.id === editingCategoryId) : null
  useEffect(() => {
    if (!editingCategoryId || !categories.length) return
    const c = categories.find((cat) => cat.id === editingCategoryId)
    if (!c) return
    setGender(c.gender ?? "MALE")
    setType(c.type)
    setFormat(c.format)
    setRefereeRequired(c.refereeRequired)
    setLeagueMode((c.leagueMode as "FULL" | "SELECT") ?? "FULL")
    setFullLeaguePlayerCount(c.fullLeaguePlayerCount ?? 5)
    setSelectLeagueMatchCount(c.selectLeagueMatchCount ?? 5)
    setRoundCount(c.roundCount ?? 3)
    setCapacity(c.capacity != null ? String(c.capacity) : "")
    setMinEntries(c.minEntries != null ? String(c.minEntries) : "")
    if (c.tablesPerMatch != null) {
      setTablesPerMatch(c.tablesPerMatch || 1)
    } else {
      setTablesPerMatch(1)
    }
    if (c.courtRange) {
      const m = String(c.courtRange).match(/(\d+)\D+(\d+)/)
      if (m) {
        setCourtStart(m[1] ?? "")
        setCourtEnd(m[2] ?? "")
      } else {
        setCourtStart("")
        setCourtEnd("")
      }
    } else {
      setCourtStart("")
      setCourtEnd("")
    }
    setEntryFeeCard(c.entryFeeCard != null ? String(c.entryFeeCard) : "")
    setEntryFeeCash(c.entryFeeCash != null ? String(c.entryFeeCash) : "")
    const ts = c.teamMatchStructure
    if (Array.isArray(ts) && ts.length > 0) {
      setTeamSlots(ts.map((s) => ({ order: s.order, type: (s.type === "DOUBLES" ? "DOUBLES" : "SINGLES") })))
    }
  }, [editingCategoryId, categories])

  // 形式に応じてリーグ方式を自動設定（フル / セレクト）
  useEffect(() => {
    if (format === "ROUND_ROBIN") {
      setLeagueMode("FULL")
    } else if (format === "SELECT_ROUND") {
      setLeagueMode("SELECT")
    }
  }, [format])

  const addTeamSlot = () => {
    setTeamSlots((prev) => {
      const nextOrder = prev.length + 1
      return [...prev, { order: nextOrder, type: "SINGLES" }]
    })
  }

  const removeTeamSlot = (order: number) => {
    setTeamSlots((prev) => {
      const filtered = prev.filter((s) => s.order !== order)
      const reindexed = filtered.map((s, idx) => ({ ...s, order: idx + 1 }))
      return reindexed.length ? reindexed : [{ order: 1, type: "SINGLES" }]
    })
  }

  const updateTeamSlot = (order: number, slotType: "SINGLES" | "DOUBLES") => {
    setTeamSlots((prev) =>
      prev.map((s) => (s.order === order ? { ...s, type: slotType } : s))
    )
  }

  const buildCategoryBody = (): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      gender,
      type,
      format,
      roundCount,
      refereeRequired,
    }
    if (!editingCategoryId) body.tournamentId = tournamentId
    if (isTeam) {
      body.teamMatchStructure = teamSlots.map((s) => ({ order: s.order, type: s.type }))
      body.tablesPerMatch = tablesPerMatch
    }
    if (isLeague) {
      body.leagueMode = leagueMode
      if (leagueMode === "FULL") {
        body.fullLeaguePlayerCount = Math.min(7, Math.max(3, fullLeaguePlayerCount))
      } else {
        body.selectLeagueMatchCount = Math.min(10, Math.max(3, selectLeagueMatchCount))
      }
    }
    if (courtStart.trim() || courtEnd.trim()) {
      const start = courtStart.trim() ? parseInt(courtStart, 10) : undefined
      const end = courtEnd.trim() ? parseInt(courtEnd, 10) : undefined
      if (start != null && end != null) {
        body.courtRange = `${start}-${end}`
      } else if (start != null) {
        body.courtRange = `${start}`
      } else if (end != null) {
        body.courtRange = `${end}`
      }
    }
    if (capacity.trim()) body.capacity = parseInt(capacity, 10)
    if (minEntries.trim()) body.minEntries = parseInt(minEntries, 10)
    if (ageRestrictionEnabled) {
      const min = ageMin.trim() ? parseInt(ageMin, 10) : undefined
      const max = ageMax.trim() ? parseInt(ageMax, 10) : undefined
      if (min != null || max != null) body.ageRestriction = { minAge: min, maxAge: max }
    }
    if (ratingRestrictionEnabled) {
      const min = ratingMin.trim() ? parseInt(ratingMin, 10) : undefined
      const max = ratingMax.trim() ? parseInt(ratingMax, 10) : undefined
      if (min != null || max != null) body.ratingRestriction = { minRating: min, maxRating: max }
    }
    if (entryFeeCard.trim()) body.entryFeeCard = parseInt(entryFeeCard, 10)
    if (entryFeeCash.trim()) body.entryFeeCash = parseInt(entryFeeCash, 10)
    return body
  }

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    onError(null)
    setSubmitting(true)
    try {
      const body = buildCategoryBody()
      const url = editingCategoryId
        ? `${getBaseUrl()}/api/categories/${editingCategoryId}`
        : `${getBaseUrl()}/api/categories`
      const res = await fetch(url, {
        method: editingCategoryId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? (editingCategoryId ? "種目の更新に失敗しました" : "種目の追加に失敗しました"))
      setEditingCategoryId(null)
      onSaved()
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">③ 種目作成</h2>

      {categories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">登録済み種目</h3>
          <ul className="border border-gray-700 rounded divide-y divide-gray-700">
            {categories.map((c) => (
              <li key={c.id} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                <span className="font-medium">{getCategoryDisplayName(c)}</span>
                <span className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">
                    {c.format}
                    {c.leagueMode && ` (${c.leagueMode})`}
                    {c.capacity != null && ` 定員${c.capacity}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingCategoryId(c.id)}
                    className="text-xs border border-gray-600 px-2 py-1 rounded hover:bg-gray-800"
                  >
                    編集
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmitCategory} className="space-y-4 max-w-xl border border-gray-800 rounded p-4">
        <h3 className="font-medium">{editingCategoryId ? "種目を編集" : "種目を追加"}</h3>
        <div className="grid gap-3 text-sm">
          <div>
            <label className="block mb-1">性別 *</label>
            <select
              value={gender}
              onChange={(e) => {
                const v = e.target.value
                setGender(v)
                if (v === "MIX") setType("DOUBLES")
              }}
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            >
              <option value="MALE">男子</option>
              <option value="FEMALE">女子</option>
              <option value="MIXED">混成</option>
              <option value="MIX">ミックス</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">種目 *</label>
            <select
              value={type}
              onChange={(e) => setTypeWithRefereeDefault(e.target.value)}
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            >
              <option value="SINGLES" disabled={isMix}>シングルス</option>
              <option value="DOUBLES">ダブルス</option>
              <option value="TEAM" disabled={isMix}>団体</option>
            </select>
            {isMix && (
              <p className="text-xs text-gray-400 mt-1">ミックスはダブルスのみです</p>
            )}
          </div>
          {isTeam && (
            <div className="border border-gray-700 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">団体戦の試合構成</div>
                <button
                  type="button"
                  onClick={addTeamSlot}
                  className="text-xs border border-gray-700 px-2 py-1 rounded hover:bg-gray-900"
                >
                  + 枠を追加
                </button>
              </div>
              <div className="space-y-2">
                {teamSlots.map((s) => (
                  <div key={s.order} className="flex items-center gap-2">
                    <div className="w-16 text-gray-400 text-xs">
                      {s.order}枠目
                    </div>
                    <select
                      value={s.type}
                      onChange={(e) =>
                        updateTeamSlot(
                          s.order,
                          e.target.value as "SINGLES" | "DOUBLES"
                        )
                      }
                      className="flex-1 border border-gray-700 bg-black px-3 py-2 rounded"
                    >
                      <option value="SINGLES">シングルス</option>
                      <option value="DOUBLES">ダブルス</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTeamSlot(s.order)}
                      className="text-xs text-red-400 hover:underline"
                      disabled={teamSlots.length <= 1}
                      aria-disabled={teamSlots.length <= 1}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400">
                例）1枠目: シングルス、2枠目: ダブルス…のように自由に並べられます。
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <label className="block mb-1">1対戦あたりの台数</label>
                <select
                  value={tablesPerMatch}
                  onChange={(e) => setTablesPerMatch(parseInt(e.target.value, 10) || 1)}
                  className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
                >
                  <option value={1}>1台</option>
                  <option value={2}>2台</option>
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block mb-1">形式 *</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            >
              <option value="ROUND_ROBIN">リーグ戦（フル）</option>
              <option value="SELECT_ROUND">リーグ戦（セレクト）</option>
              <option value="TOURNAMENT">トーナメント戦</option>
              <option value="GROUP_TO_TOURNAMENT">予選リーグ→決勝トーナメント</option>
            </select>
          </div>
          {isGroupToTournament && (
            <div className="border border-gray-700 rounded p-3 space-y-3">
              <div className="font-medium text-sm">予選リーグ→決勝トーナメントの設定</div>
              <div>
                <label className="block mb-1 text-sm">予選リーグ方式</label>
                <select
                  value={groupToLeagueMode}
                  onChange={(e) => setGroupToLeagueMode(e.target.value as "FULL" | "SELECT")}
                  className="w-full border border-gray-700 bg-black px-3 py-2 rounded text-sm"
                >
                  <option value="FULL">フル</option>
                  <option value="SELECT">セレクト</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm">決勝トーナメント進出</label>
                <select
                  value={groupToAdvance}
                  onChange={(e) => setGroupToAdvance(e.target.value as "TOP_1" | "TOP_2" | "TOP_3" | "ALL")}
                  className="w-full border border-gray-700 bg-black px-3 py-2 rounded text-sm"
                >
                  <option value="TOP_1">1位のみ</option>
                  <option value="TOP_2">1・2位</option>
                  <option value="TOP_3">1・2・3位</option>
                  <option value="ALL">全ての順位</option>
                </select>
              </div>
            </div>
          )}
          {isLeague && (
            <>
              {leagueMode === "FULL" && (
                <div>
                  <label className="block mb-1">
                    {type === "DOUBLES"
                      ? "リーグ構成組数"
                      : type === "TEAM"
                      ? "リーグ構成チーム数"
                      : "リーグ構成人数"}
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={7}
                    value={fullLeaguePlayerCount}
                    onChange={(e) =>
                      setFullLeaguePlayerCount(parseInt(e.target.value, 10) || 3)
                    }
                    className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
                    placeholder="3〜7"
                  />
                </div>
              )}
              {leagueMode === "SELECT" && (
                <>
                  <div>
                    <label className="block mb-1">試合数（3〜10）</label>
                    <input
                      type="number"
                      min={3}
                      max={10}
                      value={selectLeagueMatchCount}
                      onChange={(e) =>
                        setSelectLeagueMatchCount(
                          parseInt(e.target.value, 10) || 3
                        )
                      }
                      className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">ラウンド数</label>
                    <input
                      type="number"
                      min={1}
                      value={roundCount}
                      onChange={(e) =>
                        setRoundCount(parseInt(e.target.value, 10) || 1)
                      }
                      className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
                    />
                  </div>
                </>
              )}
            </>
          )}
          <div>
            <label className="block mb-1">
              定員（{type === "DOUBLES" ? "組" : type === "TEAM" ? "チーム" : "人"}）
            </label>
            <input
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
              placeholder={type === "DOUBLES" ? "例: 16" : type === "TEAM" ? "例: 8" : "例: 32"}
            />
          </div>
          <div>
            <label className="block mb-1">
              最小催行{type === "DOUBLES" ? "組数" : type === "TEAM" ? "チーム数" : "人数"}
            </label>
            <input
              type="number"
              min={0}
              value={minEntries}
              onChange={(e) => setMinEntries(e.target.value)}
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
              placeholder="例: 4"
            />
          </div>
          <div>
            <label className="block mb-1">台指定（○〜○）</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={courtStart}
                onChange={(e) => setCourtStart(e.target.value)}
                className="w-20 border border-gray-700 bg-black px-3 py-2 rounded"
                placeholder="1"
              />
              <span className="text-gray-400">〜</span>
              <input
                type="number"
                min={0}
                value={courtEnd}
                onChange={(e) => setCourtEnd(e.target.value)}
                className="w-20 border border-gray-700 bg-black px-3 py-2 rounded"
                placeholder="4"
              />
              <span className="text-gray-400 text-xs ml-1">コート</span>
            </div>
          </div>
          <div className="border border-gray-700 rounded p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ageRestriction"
                checked={ageRestrictionEnabled}
                onChange={(e) => setAgeRestrictionEnabled(e.target.checked)}
              />
              <label htmlFor="ageRestriction">年齢指定あり</label>
            </div>
            {ageRestrictionEnabled && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="number"
                  min={0}
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="w-20 border border-gray-700 bg-black px-2 py-1 rounded"
                  placeholder="最小"
                />
                <span className="text-gray-400">〜</span>
                <input
                  type="number"
                  min={0}
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="w-20 border border-gray-700 bg-black px-2 py-1 rounded"
                  placeholder="最大"
                />
                <span className="text-gray-400 text-xs">歳</span>
              </div>
            )}
          </div>
          <div className="border border-gray-700 rounded p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ratingRestriction"
                checked={ratingRestrictionEnabled}
                onChange={(e) => setRatingRestrictionEnabled(e.target.checked)}
              />
              <label htmlFor="ratingRestriction">レーティング指定あり</label>
            </div>
            {ratingRestrictionEnabled && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="number"
                  value={ratingMin}
                  onChange={(e) => setRatingMin(e.target.value)}
                  className="w-24 border border-gray-700 bg-black px-2 py-1 rounded"
                  placeholder="最小"
                />
                <span className="text-gray-400">〜</span>
                <input
                  type="number"
                  value={ratingMax}
                  onChange={(e) => setRatingMax(e.target.value)}
                  className="w-24 border border-gray-700 bg-black px-2 py-1 rounded"
                  placeholder="最大"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={refereeRequired}
                onChange={() => setRefereeRequired(true)}
              />
              審判割当あり
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!refereeRequired}
                onChange={() => setRefereeRequired(false)}
              />
              審判割当なし
            </label>
          </div>
          <div>
            <label className="block mb-1">参加費（事前・カード）円</label>
            <input
              type="number"
              min={0}
              value={entryFeeCard}
              onChange={(e) => setEntryFeeCard(e.target.value)}
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block mb-1">参加費（当日・現金）円</label>
            <input
              type="number"
              min={0}
              value={entryFeeCash}
              onChange={(e) => setEntryFeeCash(e.target.value)}
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="border border-gray-600 px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "保存中..." : editingCategoryId ? "更新" : "完了"}
          </button>
          {editingCategoryId && (
            <button
              type="button"
              onClick={() => setEditingCategoryId(null)}
              className="border border-gray-600 px-4 py-2 rounded hover:bg-gray-800"
            >
              キャンセル
            </button>
          )}
        </div>
      </form>

      <p className="text-gray-400 text-sm">
        種目を追加したら「4. 公開」で内容を確認し、公開してください。
      </p>
    </div>
  )
}

function Step4Publish({
  tournament,
  onPublished,
  onError,
  setSaving,
  saving,
}: {
  tournament: Tournament
  onPublished: () => void
  onError: (s: string | null) => void
  setSaving: (b: boolean) => void
  saving: boolean
}) {
  const handlePublish = async () => {
    onError(null)
    setSaving(true)
    try {
      const res = await fetch(
        `${getBaseUrl()}/api/tournaments/${tournament.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "REGISTRATION_OPEN" }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "公開に失敗しました")
      onPublished()
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "公開に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">④ 公開</h2>
      <div className="border border-gray-700 rounded p-4 space-y-2 text-sm max-w-xl">
        <p><strong>大会名:</strong> {tournament.name}</p>
        <p><strong>会場:</strong> {tournament.location}</p>
        <p><strong>種目数:</strong> {tournament.categories.length} 種目</p>
        {tournament.categories.length === 0 && (
          <p className="text-amber-400">種目がありません。ステップ3で種目を追加してください。</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handlePublish}
          disabled={saving || tournament.categories.length === 0}
          className="border border-green-700 bg-green-900/30 px-4 py-2 rounded hover:bg-green-900/50 disabled:opacity-50"
        >
          {saving ? "公開中..." : "公開"}
        </button>
        <p className="text-gray-400 text-sm self-center">
          公開するとユーザーが大会一覧で見られ、エントリー可能になります。
        </p>
      </div>
    </div>
  )
}
