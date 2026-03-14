"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

type Team = {
  id: string
  name: string
  order: number
  members: { id: string; userId: string; user: { id: string; name: string } }[]
}

type TeamMatch = {
  id: string
  roundNumber: number
  status: string
  winnerTeamId: string | null
  teamA: { id: string; name: string }
  teamB: { id: string; name: string }
}

type Category = {
  id: string
  type: string
  teamMatchStructure: { order: number; type: string }[] | null
}

type Participant = {
  userId: string
  user: { id: string; name: string }
}

export default function TournamentTeamPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>
}) {
  const { id: tournamentId, categoryId } = use(params)
  const [category, setCategory] = useState<Category | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMatches, setTeamMatches] = useState<TeamMatch[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [newTeamName, setNewTeamName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [addingMemberTeamId, setAddingMemberTeamId] = useState<string | null>(null)

  const base = getBaseUrl()

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [catRes, teamsRes, matchesRes, partRes] = await Promise.all([
        fetch(`${base}/api/tournaments/${tournamentId}`, { cache: "no-store" }),
        fetch(`${base}/api/categories/${categoryId}/teams`, { cache: "no-store" }),
        fetch(`${base}/api/categories/${categoryId}/team-matches`, { cache: "no-store" }),
        fetch(`${base}/api/tournaments/${tournamentId}/participants`, { cache: "no-store" }),
      ])
      const tournamentData = catRes.ok ? await catRes.json() : null
      if (tournamentData?.categories) {
        const c = tournamentData.categories.find((x: { id: string }) => x.id === categoryId)
        setCategory(c ?? null)
      } else {
        setCategory(null)
      }
      if (teamsRes.ok) setTeams(await teamsRes.json())
      else setTeams([])
      if (matchesRes.ok) setTeamMatches(await matchesRes.json())
      else setTeamMatches([])
      if (partRes.ok) {
        const list = await partRes.json()
        setParticipants(list.filter((p: { joinStatus: string; checkedIn: boolean }) => p.joinStatus === "PAID" && p.checkedIn))
      } else setParticipants([])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [tournamentId, categoryId])

  const createTeam = async () => {
    const name = newTeamName.trim() || "新チーム"
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${base}/api/categories/${categoryId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "Failed to create team")
      setMessage("チームを作成しました")
      setNewTeamName("")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setWorking(false)
    }
  }

  const addMember = async (teamId: string, userId: string) => {
    setAddingMemberTeamId(teamId)
    setError(null)
    try {
      const res = await fetch(`${base}/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "Failed to add member")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setAddingMemberTeamId(null)
    }
  }

  const removeMember = async (teamId: string, userId: string) => {
    setError(null)
    try {
      const res = await fetch(`${base}/api/teams/${teamId}/members/${userId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? "Failed to remove member")
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    }
  }

  const generateTeamMatches = async () => {
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${base}/api/categories/${categoryId}/generate-team-matches`, {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate team matches")
      setMessage("団体試合を生成しました")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setWorking(false)
    }
  }

  const memberIdsInTeam = (team: Team) => new Set(team.members.map((m) => m.userId))
  const availableForTeam = (team: Team) =>
    participants.filter((p) => !memberIdsInTeam(team).has(p.user.id))

  if (loading) {
    return <div className="text-gray-400">読み込み中...</div>
  }
  if (!category || category.type !== "TEAM") {
    return (
      <div className="text-red-400">
        カテゴリが見つからないか、団体種目ではありません。
        <Link href={`/tournaments/${tournamentId}/categories`} className="ml-2 text-blue-400 underline">
          カテゴリ一覧へ
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/tournaments/${tournamentId}/categories`} className="text-sm text-blue-400 hover:underline">
          ← カテゴリ・ラウンド管理
        </Link>
        <h1 className="text-2xl font-bold mt-2">団体戦: チーム・試合管理</h1>
        <p className="text-sm text-gray-400 mt-1">
          チームを作成し、メンバーを割り当ててから「団体試合を生成」を実行してください。
        </p>
      </div>

      {message && <div className="text-green-400 text-sm">{message}</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      <section className="border border-gray-700 rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">チーム一覧</h2>
        <div className="flex flex-wrap items-end gap-2">
          <input
            type="text"
            className="border border-gray-700 bg-black px-3 py-2 rounded w-48"
            placeholder="チーム名"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
          />
          <button
            type="button"
            onClick={createTeam}
            disabled={working}
            className="border border-gray-700 px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
          >
            {working ? "作成中..." : "チームを追加"}
          </button>
        </div>
        {teams.length === 0 ? (
          <p className="text-sm text-gray-400">チームがありません。上から追加してください。</p>
        ) : (
          <ul className="space-y-3">
            {teams.map((team) => (
              <li key={team.id} className="border border-gray-800 rounded p-3 text-sm">
                <div className="font-medium mb-1">{team.name}</div>
                <ul className="text-gray-400 mb-2">
                  {team.members.length === 0 ? (
                    <li>メンバーなし</li>
                  ) : (
                    team.members.map((m) => (
                      <li key={m.id} className="flex items-center gap-2">
                        {m.user?.name ?? m.userId}
                        <button
                          type="button"
                          className="text-red-400 text-xs hover:underline"
                          onClick={() => removeMember(team.id, m.userId)}
                        >
                          削除
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <div className="flex items-center gap-2">
                  <select
                    className="border border-gray-700 bg-black px-2 py-1 rounded text-xs"
                    onChange={(e) => {
                      const uid = e.target.value
                      if (uid) {
                        addMember(team.id, uid)
                        e.target.value = ""
                      }
                    }}
                    disabled={addingMemberTeamId === team.id || availableForTeam(team).length === 0}
                    value=""
                  >
                    <option value="">メンバーを追加</option>
                    {availableForTeam(team).map((p) => (
                      <option key={p.user.id} value={p.user.id}>
                        {p.user?.name ?? p.user.id}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-gray-700 rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">団体試合</h2>
        {teamMatches.length === 0 ? (
          <>
            <p className="text-sm text-gray-400">
              チームが2つ以上ある場合、「団体試合を生成」で round-robin の対戦を自動作成します。
            </p>
            <button
              type="button"
              onClick={generateTeamMatches}
              disabled={working || teams.length < 2}
              className="border border-gray-700 px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
            >
              {working ? "生成中..." : "団体試合を生成"}
            </button>
          </>
        ) : (
          <ul className="space-y-2">
            {teamMatches.map((tm) => (
              <li key={tm.id}>
                <Link
                  href={`/team-matches/${tm.id}`}
                  className="block border border-gray-700 rounded p-3 hover:bg-gray-900"
                >
                  {tm.teamA.name} vs {tm.teamB.name}
                  <span className="ml-2 text-gray-400 text-sm">
                    第{tm.roundNumber}試合 • {tm.status}
                    {tm.winnerTeamId && ` • 勝者: ${tm.winnerTeamId === tm.teamA.id ? tm.teamA.name : tm.teamB.name}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
