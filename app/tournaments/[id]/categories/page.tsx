"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

type Category = {
  id: string
  type: string
  format: string
  roundCount: number | null
  currentRound: number
  isLocked: boolean
}

type TournamentWithCategories = {
  id: string
  name: string
  status: string
  categories: Category[]
}

type HealthSummary = {
  healthy: boolean
  issues: string[]
}

export default function TournamentCategoriesPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = use(params)

  const [tournament, setTournament] = useState<TournamentWithCategories | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [workingCategory, setWorkingCategory] = useState<string | null>(null)

  const [newGender, setNewGender] = useState("MIXED")
  const [newType, setNewType] = useState("SINGLES")
  const [newFormat, setNewFormat] = useState("SELECT_ROUND")
  const [newRoundCount, setNewRoundCount] = useState("3")

  const [healthByCategory, setHealthByCategory] = useState<
    Record<string, HealthSummary | undefined>
  >({})
  const [championByCategory, setChampionByCategory] = useState<
    Record<string, { id: string; name: string | null } | null | undefined>
  >({})

  const loadTournament = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(
        `${getBaseUrl()}/api/tournaments/${tournamentId}`,
        { cache: "no-store" }
      )

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "大会情報の読み込みに失敗しました")
      }

      setTournament(data)
    } catch (e: any) {
      setError(e.message ?? "大会情報の読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTournament()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId])

  const runCategoryAction = async (
    categoryId: string,
    endpoint: string,
    options?: RequestInit
  ) => {
    try {
      setWorkingCategory(categoryId)
      setActionMessage(null)
      setError(null)

      const res = await fetch(
        `${getBaseUrl()}/api/categories/${categoryId}/${endpoint}`,
        options
      )

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.error ?? `アクションに失敗しました (${endpoint})`)
      }

      setActionMessage(
        `Action '${endpoint}' succeeded for category ${categoryId}`
      )
      await loadTournament()
    } catch (e: any) {
      setError(e.message ?? "アクションに失敗しました")
    } finally {
      setWorkingCategory(null)
    }
  }

  const runHealth = async (categoryId: string) => {
    try {
      const res = await fetch(
        `${getBaseUrl()}/api/categories/${categoryId}/health`,
        { cache: "no-store" }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "ヘルスチェックに失敗しました")
      }
      setHealthByCategory((prev) => ({
        ...prev,
        [categoryId]: data.integrity,
      }))
    } catch (e) {
      // Do not surface as global error; keep UI simple
    }
  }

  const runChampion = async (categoryId: string) => {
    try {
      const res = await fetch(
        `${getBaseUrl()}/api/categories/${categoryId}/champion`,
        { cache: "no-store" }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "優勝者の取得に失敗しました")
      }
      setChampionByCategory((prev) => ({
        ...prev,
        [categoryId]: data.champion ?? { id: data.championId, name: null },
      }))
    } catch (e) {
      // ignore in UI
    }
  }

  const createCategory = async () => {
    try {
      setError(null)
      setActionMessage(null)

      const roundCount =
        newRoundCount.trim() === ""
          ? null
          : Number.isNaN(Number(newRoundCount))
          ? null
          : Number(newRoundCount)

      const res = await fetch(`${getBaseUrl()}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          gender: newGender,
          type: newType,
          format: newFormat,
          roundCount,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "カテゴリの作成に失敗しました")
      }

      setActionMessage("カテゴリを作成しました")
      await loadTournament()
    } catch (e: any) {
      setError(e.message ?? "カテゴリの作成に失敗しました")
    }
  }

  if (loading) {
    return <div>カテゴリを読み込み中...</div>
  }

  if (error) {
    return <div className="text-red-400">{error}</div>
  }

  if (!tournament) {
    return <div>大会が見つかりません</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">
          {tournament.name} のカテゴリ
        </h1>
        <p className="text-sm text-gray-400">
          各カテゴリごとにスイスラウンドや決勝トーナメントの生成・確定を行います。
        </p>
      </div>

      <section className="border border-gray-800 rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">カテゴリを作成</h2>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="flex flex-col gap-1">
            <label>性別</label>
            <select
              className="border border-gray-700 bg-black px-3 py-2 rounded"
              value={newGender}
              onChange={(e) => setNewGender(e.target.value)}
            >
              <option value="MALE">男子</option>
              <option value="FEMALE">女子</option>
              <option value="MIXED">混成</option>
              <option value="MIX">ミックス</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label>種別</label>
            <select
              className="border border-gray-700 bg-black px-3 py-2 rounded"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              <option value="SINGLES">SINGLES</option>
              <option value="DOUBLES">DOUBLES</option>
              <option value="TEAM">TEAM</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label>形式</label>
            <select
              className="border border-gray-700 bg-black px-3 py-2 rounded"
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
            >
              <option value="SELECT_ROUND">SELECT_ROUND (Swiss-style)</option>
              <option value="ROUND_ROBIN">ROUND_ROBIN</option>
              <option value="TOURNAMENT">TOURNAMENT</option>
              <option value="GROUP_TO_TOURNAMENT">
                GROUP_TO_TOURNAMENT
              </option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label>ラウンド数（スイス用）</label>
            <input
              className="border border-gray-700 bg-black px-3 py-2 rounded"
              value={newRoundCount}
              onChange={(e) => setNewRoundCount(e.target.value)}
              placeholder="例: 3"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={createCategory}
          className="mt-2 border border-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-900"
        >
          カテゴリを作成
        </button>
      </section>

      {actionMessage && (
        <div className="text-green-400 text-sm">{actionMessage}</div>
      )}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">既存のカテゴリ</h2>

        {tournament.categories.length === 0 ? (
          <div className="text-sm text-gray-400">
            まだカテゴリがありません。上のフォームから作成してください。
          </div>
        ) : (
          <div className="space-y-4">
            {tournament.categories.map((c) => {
              const health = healthByCategory[c.id]
              const champion = championByCategory[c.id]

              return (
                <div
                  key={c.id}
                  className="border border-gray-800 rounded p-4 space-y-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        {c.type} / {c.format}
                      </div>
                      <div className="text-gray-400 text-xs">
                        第 {c.currentRound} / {c.roundCount ?? "?"} ラウンド •{" "}
                        {c.isLocked ? "ロック済み" : "進行中"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-1">
                    {c.type === "TEAM" && (
                      <Link
                        href={`/tournaments/${tournamentId}/team/${c.id}`}
                        className="border border-blue-700 text-blue-300 px-3 py-1 rounded hover:bg-gray-900"
                      >
                        チーム・団体試合
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={workingCategory === c.id}
                      onClick={() =>
                        runCategoryAction(c.id, "generate-matches", {
                          method: "POST",
                        })
                      }
                      className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
                    >
                      全ラウンドを生成（SELECT_ROUND）
                    </button>
                    <button
                      type="button"
                      disabled={workingCategory === c.id}
                      onClick={() =>
                        runCategoryAction(c.id, "generate-next-round", {
                          method: "POST",
                        })
                      }
                      className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
                    >
                      次のスイスラウンドを生成
                    </button>
                    <button
                      type="button"
                      disabled={workingCategory === c.id}
                      onClick={() =>
                        runCategoryAction(c.id, "generate-finals", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ finalsSize: 4 }),
                        })
                      }
                      className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
                    >
                      TOP4 決勝トーナメントを生成
                    </button>
                    <button
                      type="button"
                      disabled={workingCategory === c.id}
                      onClick={() =>
                        runCategoryAction(c.id, "generate-finals", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ finalsSize: 8 }),
                        })
                      }
                      className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
                    >
                      TOP8 決勝トーナメントを生成
                    </button>
                    <button
                      type="button"
                      disabled={workingCategory === c.id}
                      onClick={() =>
                        runCategoryAction(c.id, "generate-final-match", {
                          method: "POST",
                        })
                      }
                      className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
                    >
                      決勝戦を生成
                    </button>
                    <button
                      type="button"
                      disabled={workingCategory === c.id}
                      onClick={() =>
                        runCategoryAction(c.id, "finalize", {
                          method: "POST",
                        })
                      }
                      className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
                    >
                      カテゴリを確定
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => runHealth(c.id)}
                      className="underline text-gray-400"
                    >
                      整合性チェック
                    </button>
                    <button
                      type="button"
                      onClick={() => runChampion(c.id)}
                      className="underline text-gray-400"
                    >
                      優勝者を表示
                    </button>
                  </div>

                  {health && (
                    <div className="text-xs mt-1">
                      <span
                        className={
                          health.healthy
                            ? "text-green-400"
                            : "text-yellow-300"
                        }
                      >
                        {health.healthy
                          ? "整合性: 問題ありません"
                          : "整合性: 問題が検出されました"}
                      </span>
                      {!health.healthy && health.issues.length > 0 && (
                        <ul className="mt-1 list-disc list-inside text-gray-300">
                          {health.issues.map((msg, i) => (
                            <li key={i}>{msg}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {champion && (
                    <div className="text-xs mt-1 text-blue-300">
                      優勝者: {champion.name ?? champion.id}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}


