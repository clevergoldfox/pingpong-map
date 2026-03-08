import Link from "next/link"
import { TierBadge } from "@/components/TierBadge"

async function getLeaderboard() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/leaderboard/season`, {
        cache: "no-store",
    })
    return res.json()
}

export default async function LeaderboardPage() {
    const data = await getLeaderboard()

    if (!data.users) {
        return <div>アクティブなシーズンがありません</div>
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">
                {data.season} シーズンランキング
            </h1>

            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2">順位</th>
                        <th className="text-left py-2">プレイヤー</th>
                        <th className="text-left py-2">レーティング</th>
                        <th className="text-left py-2">ティア</th>
                    </tr>
                </thead>
                <tbody>
                    {data.users.map((user: any, i: number) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="py-2">{i + 1}</td>
                            <td className="py-2">
                                {user.id && (
                                    <Link href={`/players/${user.id}`} className="text-blue-600">
                                        {user.name}
                                    </Link>
                                )}
                            </td>
                            <td className="py-2">{user.seasonRating}</td>
                            <td className="py-2"><TierBadge tier={user.tier} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}