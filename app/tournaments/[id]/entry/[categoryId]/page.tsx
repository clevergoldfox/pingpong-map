"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

type Category = {
  id: string
  type: string
  format: string
  gender?: string | null
  entryFeeCard?: number | null
  entryFeeCash?: number | null
  capacity?: number | null
  teamMinMembers?: number | null
  teamMaxMembers?: number | null
}

type Tournament = {
  id: string
  name: string
  location?: string
  status?: string
  startDate?: string
  categories?: Category[]
}

type MeUser = { id: string; name: string }

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

function getCategoryDisplayName(c: Category): string {
  const g = GENDER_LABEL[c.gender ?? ""] ?? c.gender ?? ""
  const t = TYPE_LABEL[c.type] ?? c.type
  return `${g}${t}`.trim() || c.type
}

export default function CategoryEntryPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>
}) {
  const { id: tournamentId, categoryId } = use(params)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [me, setMe] = useState<MeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [alreadyJoined, setAlreadyJoined] = useState(false)
  const base = getBaseUrl()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [tRes, meRes, partRes] = await Promise.all([
          fetch(`${base}/api/tournaments/${tournamentId}`, { cache: "no-store" }),
          fetch(`${base}/api/auth/me`, { cache: "no-store" }),
          fetch(`${base}/api/tournaments/${tournamentId}/participants`, { cache: "no-store" }),
        ])
        if (cancelled) return
        if (tRes.ok) {
          const tData = await tRes.json()
          setTournament(tData)
          const cat = tData.categories?.find((c: Category) => c.id === categoryId) ?? null
          setCategory(cat)
        } else {
          setTournament(null)
          setCategory(null)
        }
        let meData: { user?: MeUser } | null = null
        if (meRes.ok) {
          meData = await meRes.json()
          setMe(meData?.user ?? null)
        } else {
          setMe(null)
        }
        const partData = partRes.ok ? await partRes.json() : []
        if (meData?.user?.id && Array.isArray(partData)) {
          const joined = partData.some(
            (p: { userId: string; joinStatus: string }) =>
              p.userId === meData!.user!.id && p.joinStatus !== "CANCELED"
          )
          setAlreadyJoined(!!joined)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "読み込みに失敗しました")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [base, tournamentId, categoryId])

  const handleSinglesApply = async () => {
    if (!me) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${base}/api/tournaments/${tournamentId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "申込みに失敗しました")
      setMessage("申込みを受け付けました。決済は別途ご案内します。")
      setAlreadyJoined(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "申込みに失敗しました")
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-gray-400">読み込み中...</div>
    )
  }

  if (!tournament || !category) {
    return (
      <div className="p-4 space-y-2">
        <p className="text-red-400">大会または種目が見つかりません。</p>
        <Link href={`/tournaments/${tournamentId}`} className="text-blue-400 hover:underline text-sm">
          大会ページに戻る
        </Link>
      </div>
    )
  }

  const categoryName = getCategoryDisplayName(category)
  const feeCard = category.entryFeeCard != null ? `カード ¥${category.entryFeeCard}` : null
  const feeCash = category.entryFeeCash != null ? `当日 ¥${category.entryFeeCash}` : null
  const feeText = [feeCard, feeCash].filter(Boolean).join(" / ") || "—"
  const isSingles = category.type === "SINGLES"
  const isDoubles = category.type === "DOUBLES"
  const isTeam = category.type === "TEAM"

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/tournaments/${tournamentId}`}
          className="text-sm text-blue-400 hover:underline"
        >
          ← {tournament.name} に戻る
        </Link>
        <h1 className="text-2xl font-bold mt-2">種目詳細・申込み</h1>
        <p className="text-gray-400 text-sm mt-1">{tournament.name}</p>
      </div>

      <section className="border border-gray-700 rounded-lg p-5 space-y-3">
        <h2 className="text-xl font-semibold">{categoryName}</h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-400 w-24">形式</dt>
            <dd>{category.format}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-400 w-24">参加費</dt>
            <dd>{feeText}</dd>
          </div>
          {category.capacity != null && (
            <div className="flex gap-2">
              <dt className="text-gray-400 w-24">定員</dt>
              <dd>{category.capacity}</dd>
            </div>
          )}
          {isTeam && (category.teamMinMembers != null || category.teamMaxMembers != null) && (
            <div className="flex gap-2">
              <dt className="text-gray-400 w-24">人数</dt>
              <dd>
                {category.teamMinMembers != null && category.teamMaxMembers != null
                  ? `${category.teamMinMembers}〜${category.teamMaxMembers}人`
                  : category.teamMinMembers != null
                  ? `最小${category.teamMinMembers}人`
                  : `最大${category.teamMaxMembers}人`}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {message && <div className="text-green-400 text-sm">{message}</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      <section className="border border-gray-700 rounded-lg p-5">
        <h3 className="font-semibold mb-3">申込み</h3>

        {!me ? (
          <div>
            <p className="text-sm text-gray-400 mb-3">
              申し込むにはログインしてください。
            </p>
            <Link
            href={`/auth/login?redirect=${encodeURIComponent(`/tournaments/${tournamentId}/entry/${categoryId}`)}`}
            className="inline-block border border-blue-600 text-blue-300 px-4 py-2 rounded hover:bg-blue-900/30"
          >
              ログインして申し込む
            </Link>
          </div>
        ) : isSingles ? (
          <div>
            {alreadyJoined ? (
              <p className="text-gray-300 text-sm">
                この大会にはすでに参加登録済みです。決済は別途ご案内します。
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-3">
                  この種目に申し込むと、大会への参加登録が行われます。
                </p>
                <button
                  type="button"
                  onClick={handleSinglesApply}
                  disabled={working}
                  className="border border-green-600 text-green-300 px-4 py-2 rounded hover:bg-green-900/30 disabled:opacity-50"
                >
                  {working ? "送信中..." : "この種目に申し込む"}
                </button>
              </>
            )}
          </div>
        ) : isTeam ? (
          <div>
            <p className="text-sm text-gray-400 mb-3">
              団体戦は代表者がチーム名を入力し、メンバーを招待・承認してから申込みを確定します。
            </p>
            <Link
              href={`/tournaments/${tournamentId}/team-entry/${categoryId}`}
              className="inline-block border border-blue-600 text-blue-300 px-4 py-2 rounded hover:bg-blue-900/30"
            >
              団体戦の申込み（メンバー紐付け）へ
            </Link>
          </div>
        ) : isDoubles ? (
          <div>
            <p className="text-sm text-gray-400 mb-3">
              ダブルスはパートナーを1名紐付けてから申し込みます。現在準備中です。
            </p>
            <p className="text-sm text-gray-500">
              しばらくのあいだは、
              <Link href={`/tournaments/${tournamentId}/register`} className="text-blue-400 hover:underline ml-1">
                参加者登録
              </Link>
              からお申し込みください。
            </p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
