import Link from "next/link"
import { TierBadge } from "@/components/TierBadge"

async function getLeaderboard() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
        
        const res = await fetch(`${baseUrl}/api/leaderboard/season`, {
            cache: "no-store",
        })
        
        if (!res.ok) {
            return { users: null, error: "Failed to load leaderboard" }
        }
        
        return await res.json()
    } catch (error) {
        console.error("Error loading leaderboard:", error)
        return { users: null, error: "Failed to load leaderboard" }
    }
}

export default async function LeaderboardPage() {
    const data = await getLeaderboard()

    if (data.error) {
        return <div className="p-8 text-red-400">{data.error}</div>
    }

    if (!data.users) {
        return <div className="p-8">アクティブなシーズンがありません</div>
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