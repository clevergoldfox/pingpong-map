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
  capacity: number | null
  minEntries: number | null
  courtRange: string | null
  refereeRequired: boolean
  entryFeeCard: number | null
  entryFeeCash: number | null
  roundCount: number | null
  currentRound: number
  isLocked: boolean
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
    // dateOnly: YYYY-MM-DD
    return dateOnly ? `${dateOnly}T00:00:00` : null
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
    startDate: tournament.startDate?.slice(0, 16) || "",
    mapUrl: tournament.mapUrl || "",
    openAt: asDateOnly(tournament.openAt),
    entryDeadlineAt: asDateOnly(tournament.entryDeadlineAt),
    cancelPolicy: tournament.cancelPolicy || "",
    organizer: tournament.organizer || "",
    sponsor: tournament.sponsor || "",
    description: tournament.description || "",
  })

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
            startDate: form.startDate || undefined,
            mapUrl: form.mapUrl || null,
            openAt: dateOnlyToIsoStart(form.openAt),
            entryDeadlineAt: dateOnlyToIsoStart(form.entryDeadlineAt),
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
          <div className="flex items-stretch gap-2">
            <input
              id="openAt"
              type="date"
              value={form.openAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, openAt: e.target.value }))
              }
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            />
            <button
              type="button"
              onClick={() =>
                openNativeDatePicker(
                  document.getElementById("openAt") as HTMLInputElement | null
                )
              }
              className="border border-gray-700 px-3 rounded hover:bg-gray-900"
              aria-label="開場時間のカレンダーを開く"
              title="カレンダーを開く"
            >
              📅
            </button>
          </div>
        </div>
        <div>
          <label className="block mb-1">申込み締切日時</label>
          <div className="flex items-stretch gap-2">
            <input
              id="entryDeadlineAt"
              type="date"
              value={form.entryDeadlineAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, entryDeadlineAt: e.target.value }))
              }
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            />
            <button
              type="button"
              onClick={() =>
                openNativeDatePicker(
                  document.getElementById(
                    "entryDeadlineAt"
                  ) as HTMLInputElement | null
                )
              }
              className="border border-gray-700 px-3 rounded hover:bg-gray-900"
              aria-label="申込み締切日時のカレンダーを開く"
              title="カレンダーを開く"
            >
              📅
            </button>
          </div>
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
          />
        </div>
        <div>
          <label className="block mb-1">協賛団体</label>
          <input
            type="text"
            value={form.sponsor}
            onChange={(e) => setForm((f) => ({ ...f, sponsor: e.target.value }))}
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1">大会説明・注意事項</label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded min-h-[120px]"
          />
        </div>
        <div>
          <label className="block mb-1">大会開始日 *</label>
          <input
            type="datetime-local"
            value={form.startDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, startDate: e.target.value }))
            }
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            required
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
  const [leagueMode, setLeagueMode] = useState<"FULL" | "SELECT">("FULL")
  const [fullLeaguePlayerCount, setFullLeaguePlayerCount] = useState(5)
  const [selectLeagueMatchCount, setSelectLeagueMatchCount] = useState(5)
  const [teamSlots, setTeamSlots] = useState<Array<{ order: number; type: "SINGLES" | "DOUBLES" }>>([
    { order: 1, type: "SINGLES" },
  ])
  const [capacity, setCapacity] = useState("")
  const [minEntries, setMinEntries] = useState("")
  const [courtRange, setCourtRange] = useState("")
  const [ageRestrictionEnabled, setAgeRestrictionEnabled] = useState(false)
  const [ageMin, setAgeMin] = useState("")
  const [ageMax, setAgeMax] = useState("")
  const [ratingRestrictionEnabled, setRatingRestrictionEnabled] = useState(false)
  const [ratingMin, setRatingMin] = useState("")
  const [ratingMax, setRatingMax] = useState("")
  const [refereeRequired, setRefereeRequired] = useState(false)
  const [entryFeeCard, setEntryFeeCard] = useState("")
  const [entryFeeCash, setEntryFeeCash] = useState("")
  const [roundCount, setRoundCount] = useState(3)
  const [submitting, setSubmitting] = useState(false)

  const isLeague = format === "ROUND_ROBIN" || format === "SELECT_ROUND"
  const isTeam = type === "TEAM"

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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    onError(null)
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        tournamentId,
        gender,
        type,
        format,
        roundCount,
        refereeRequired,
      }
      if (isTeam) {
        body.teamMatchStructure = teamSlots.map((s) => ({
          order: s.order,
          type: s.type,
        }))
      }
      if (isLeague) {
        body.leagueMode = leagueMode
        if (leagueMode === "FULL") {
          body.fullLeaguePlayerCount = Math.min(7, Math.max(3, fullLeaguePlayerCount))
        } else {
          body.selectLeagueMatchCount = Math.min(10, Math.max(3, selectLeagueMatchCount))
        }
      }
      if (capacity.trim()) body.capacity = parseInt(capacity, 10)
      if (minEntries.trim()) body.minEntries = parseInt(minEntries, 10)
      if (courtRange.trim()) body.courtRange = courtRange
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

      const res = await fetch(`${getBaseUrl()}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "種目の追加に失敗しました")
      onSaved()
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "種目の追加に失敗しました")
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
              <li key={c.id} className="px-3 py-2 text-sm">
                {c.gender || "—"} / {c.type} / {c.format}
                {c.leagueMode && ` (${c.leagueMode})`}
                {c.capacity != null && ` 定員${c.capacity}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleAddCategory} className="space-y-4 max-w-xl border border-gray-800 rounded p-4">
        <h3 className="font-medium">種目を追加</h3>
        <div className="grid gap-3 text-sm">
          <div>
            <label className="block mb-1">性別 *</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
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
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            >
              <option value="SINGLES">シングルス</option>
              <option value="DOUBLES">ダブルス</option>
              <option value="TEAM">団体</option>
            </select>
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
          {isLeague && (
            <>
              <div>
                <label className="block mb-1">リーグ方式</label>
                <select
                  value={leagueMode}
                  onChange={(e) =>
                    setLeagueMode(e.target.value as "FULL" | "SELECT")
                  }
                  className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
                >
                  <option value="FULL">フル（全対戦・3〜7人）</option>
                  <option value="SELECT">セレクト（試合数指定・3〜10試合）</option>
                </select>
              </div>
              {leagueMode === "FULL" && (
                <div>
                  <label className="block mb-1">人数（3〜7）</label>
                  <input
                    type="number"
                    min={3}
                    max={7}
                    value={fullLeaguePlayerCount}
                    onChange={(e) =>
                      setFullLeaguePlayerCount(parseInt(e.target.value, 10) || 3)
                    }
                    className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
                  />
                </div>
              )}
              {leagueMode === "SELECT" && (
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
              )}
              <div>
                <label className="block mb-1">ラウンド数（セレクト時等）</label>
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
          <div>
            <label className="block mb-1">定員</label>
            <input
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
              placeholder="例: 32"
            />
          </div>
          <div>
            <label className="block mb-1">最小催行人数</label>
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
            <label className="block mb-1">台指定（例: 1〜4コート）</label>
            <input
              type="text"
              value={courtRange}
              onChange={(e) => setCourtRange(e.target.value)}
              className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
              placeholder="1〜4"
            />
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="refereeRequired"
              checked={refereeRequired}
              onChange={(e) => setRefereeRequired(e.target.checked)}
            />
            <label htmlFor="refereeRequired">審判あり</label>
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
        <button
          type="submit"
          disabled={submitting}
          className="border border-gray-600 px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "追加中..." : "種目を追加"}
        </button>
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
          {saving ? "公開中..." : "参加受付で公開する"}
        </button>
        <p className="text-gray-400 text-sm self-center">
          公開するとユーザーが大会一覧で見られ、エントリー可能になります。
        </p>
      </div>
    </div>
  )
}
