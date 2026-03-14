import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"
import { TournamentStatusControls } from "@/components/TournamentStatusControls"
import { getCurrentUser } from "@/lib/current-user"

async function getTournament(id: string) {
    const res = await fetch(`${getBaseUrl()}/api/tournaments/${id}`, { cache: "no-store" })
    return res.json()
}

async function getMatches(id: string) {
    const res = await fetch(`${getBaseUrl()}/api/tournaments/${id}/matches`, { cache: "no-store" })
    return res.json()
}

async function getStandings(id: string) {
    const res = await fetch(`${getBaseUrl()}/api/tournaments/${id}/standings`, { cache: "no-store" })
    return res.json()
}

export default async function TournamentPage(
    { params }: { params: Promise<{ id: string }> }
) {

    const { id } = await params

    const [tournament, matches, standings, user] = await Promise.all([
        getTournament(id),
        getMatches(id),
        getStandings(id),
        getCurrentUser(),
    ])

    const isOrganizerOrAdmin =
        user?.role === "ADMIN" || user?.role === "ORGANIZER"

    return (
        <div className="space-y-8">

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{tournament.name}</h1>
                    <p className="text-sm text-gray-400">
                        ステータス: {tournament.status}
                    </p>
                </div>
                {isOrganizerOrAdmin && (
                    <div className="flex gap-3 items-center">
                        <form action={`${getBaseUrl()}/api/tournaments/${id}/start`} method="post">
                            <button
                                type="submit"
                                className="border border-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-900"
                            >
                                大会開始
                            </button>
                        </form>
                        <TournamentStatusControls
                            tournamentId={id}
                            initialStatus={tournament.status}
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">

                <Link href={`/tournaments/${id}/register`} className="border p-4">
                    参加者登録
                </Link>

                <Link href={`/tournaments/${id}/checkin`} className="border p-4">
                    プレイヤーチェックイン
                </Link>

                <Link href={`/tournaments/${id}/matches`} className="border p-4">
                    試合一覧
                </Link>

                <Link href={`/tournaments/${id}/standings`} className="border p-4">
                    順位表
                </Link>

                {isOrganizerOrAdmin && (
                    <Link href={`/tournaments/${id}/categories`} className="border p-4">
                        カテゴリ・ラウンド管理
                    </Link>
                )}

            </div>

            {/* 種目・参加費 */}
            {tournament.categories?.length > 0 && (
                <section>
                    <h2 className="text-xl mb-3">種目・参加費</h2>
                    <ul className="space-y-2 text-sm">
                        {tournament.categories.map((c: any) => {
                            const card = c.entryFeeCard != null ? `カード ¥${c.entryFeeCard}` : null
                            const cash = c.entryFeeCash != null ? `当日 ¥${c.entryFeeCash}` : null
                            const fee = [card, cash].filter(Boolean).join(" / ") || "—"
                            return (
                                <li key={c.id} className="flex flex-wrap items-center gap-2 border border-gray-700 rounded px-3 py-2">
                                    <span className="font-medium">{c.type}</span>
                                    <span className="text-gray-400">{c.format}</span>
                                    {c.gender && <span className="text-gray-400">({c.gender})</span>}
                                    <span className="text-gray-300">参加費: {fee}</span>
                                </li>
                            )
                        })}
                    </ul>
                </section>
            )}

            {/* Standings */}

            <section>
                <h2 className="text-xl mb-3">順位表</h2>

                <table className="w-full border border-gray-700">
                    <thead>
                        <tr>
                            <th>順位</th>
                            <th>プレイヤー</th>
                            <th>ポイント</th>
                        </tr>
                    </thead>

                    <tbody>
                        {standings.map((s: any, i: number) => (
                            <tr key={s.userId}>
                                <td>{i + 1}</td>
                                <td>
                                    <Link href={`/players/${s.userId}`}>
                                        {s.user?.name ?? s.userId}
                                    </Link>
                                </td>
                                <td>{s.points}</td>
                            </tr>
                        ))}
                    </tbody>

                </table>
            </section>

            {/* Matches */}

            <section>
                <h2 className="text-xl mb-3">試合一覧</h2>

                <div className="space-y-2">
                    {matches.map((m: any) => (
                        <Link
                            key={m.id}
                            href={`/matches/${m.id}`}
                            className="block border p-3 border-gray-700 rounded"
                        >
                            {m.player1?.name ?? m.player1Id} vs {m.player2 ? (m.player2.name ?? m.player2Id) : (m.player2Id ?? "不戦勝")}
                            <span className="ml-4 text-gray-400">
                                第{m.roundNumber}ラウンド
                            </span>
                        </Link>
                    ))}
                </div>

            </section>

        </div>
    )
}