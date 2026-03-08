import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"
import { TournamentStatusControls } from "@/components/TournamentStatusControls"

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

    const tournament = await getTournament(id)
    const matches = await getMatches(id)
    const standings = await getStandings(id)

    return (
        <div className="space-y-8">

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{tournament.name}</h1>
                    <p className="text-sm text-gray-400">
                        Status: {tournament.status}
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    <form action={`${getBaseUrl()}/api/tournaments/${id}/start`} method="post">
                        <button
                            type="submit"
                            className="border border-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-900"
                        >
                            Start tournament
                        </button>
                    </form>
                    <TournamentStatusControls
                        tournamentId={id}
                        initialStatus={tournament.status}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">

                <Link href={`/tournaments/${id}/register`} className="border p-4">
                    Register Players
                </Link>

                <Link href={`/tournaments/${id}/checkin`} className="border p-4">
                    Player Check-in
                </Link>

                <Link href={`/tournaments/${id}/matches`} className="border p-4">
                    Matches
                </Link>

                <Link href={`/tournaments/${id}/standings`} className="border p-4">
                    Standings
                </Link>

                <Link href={`/tournaments/${id}/categories`} className="border p-4">
                    Categories &amp; Rounds
                </Link>

            </div>

            {/* Standings */}

            <section>
                <h2 className="text-xl mb-3">Standings</h2>

                <table className="w-full border border-gray-700">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Points</th>
                        </tr>
                    </thead>

                    <tbody>
                        {standings.map((s: any, i: number) => (
                            <tr key={s.userId}>
                                <td>{i + 1}</td>
                                <td>
                                    <Link href={`/players/${s.userId}`}>
                                        {s.userId}
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
                <h2 className="text-xl mb-3">Matches</h2>

                <div className="space-y-2">
                    {matches.map((m: any) => (
                        <Link
                            key={m.id}
                            href={`/matches/${m.id}`}
                            className="block border p-3 border-gray-700 rounded"
                        >
                            {m.player1Id} vs {m.player2Id}
                            <span className="ml-4 text-gray-400">
                                Round {m.roundNumber}
                            </span>
                        </Link>
                    ))}
                </div>

            </section>

        </div>
    )
}