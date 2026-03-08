"use client"

import { use, useEffect, useState } from "react"
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

  const [newType, setNewType] = useState("SINGLES")
  const [newFormat, setNewFormat] = useState("SELECT_ROUND")
  const [newRoundCount, setNewRoundCount] = useState("3")

  const [healthByCategory, setHealthByCategory] = useState<
    Record<string, HealthSummary | undefined>
  >({})
  const [championByCategory, setChampionByCategory] = useState<
    Record<string, string | undefined>
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
        throw new Error(data?.error ?? "Failed to load tournament")
      }

      setTournament(data)
    } catch (e: any) {
      setError(e.message ?? "Failed to load tournament")
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
        throw new Error(data?.error ?? `Action failed (${endpoint})`)
      }

      setActionMessage(
        `Action '${endpoint}' succeeded for category ${categoryId}`
      )
      await loadTournament()
    } catch (e: any) {
      setError(e.message ?? "Action failed")
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
        throw new Error(data?.error ?? "Health check failed")
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
        throw new Error(data?.error ?? "Champion lookup failed")
      }
      setChampionByCategory((prev) => ({
        ...prev,
        [categoryId]: data.championId,
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
          type: newType,
          format: newFormat,
          roundCount,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to create category")
      }

      setActionMessage("Category created")
      await loadTournament()
    } catch (e: any) {
      setError(e.message ?? "Failed to create category")
    }
  }

  if (loading) {
    return <div>Loading categories...</div>
  }

  if (error) {
    return <div className="text-red-400">{error}</div>
  }

  if (!tournament) {
    return <div>Not found</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">
          Categories for {tournament.name}
        </h1>
        <p className="text-sm text-gray-400">
          Manage Swiss rounds, finals, and finalization per category.
        </p>
      </div>

      <section className="border border-gray-800 rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">Create category</h2>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="flex flex-col gap-1">
            <label>Type</label>
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
            <label>Format</label>
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
            <label>Round count (for Swiss)</label>
            <input
              className="border border-gray-700 bg-black px-3 py-2 rounded"
              value={newRoundCount}
              onChange={(e) => setNewRoundCount(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={createCategory}
          className="mt-2 border border-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-900"
        >
          Create category
        </button>
      </section>

      {actionMessage && (
        <div className="text-green-400 text-sm">{actionMessage}</div>
      )}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Existing categories</h2>

        {tournament.categories.length === 0 ? (
          <div className="text-sm text-gray-400">
            No categories yet. Create one above.
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
                        Round {c.currentRound} of{" "}
                        {c.roundCount ?? "?"} •{" "}
                        {c.isLocked ? "LOCKED" : "OPEN"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-1">
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
                      Generate all rounds (SELECT_ROUND)
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
                      Generate next Swiss round
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
                      Generate TOP4 finals
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
                      Generate TOP8 finals
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
                      Generate final match
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
                      Finalize category
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => runHealth(c.id)}
                      className="underline text-gray-400"
                    >
                      Health check
                    </button>
                    <button
                      type="button"
                      onClick={() => runChampion(c.id)}
                      className="underline text-gray-400"
                    >
                      Show champion
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
                          ? "Integrity: OK"
                          : "Integrity issues detected"}
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
                      Champion userId: {champion}
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


