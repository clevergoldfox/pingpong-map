async function getLeaderboard() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    
    const res = await fetch(
      `${baseUrl}/api/leaderboard/season`,
      { cache: "no-store" }
    )
    
    if (!res.ok) {
      return { users: [], error: "Failed to load leaderboard" }
    }
    
    return await res.json()
  } catch (error) {
    console.error("Error loading leaderboard:", error)
    return { users: [], error: "Failed to load leaderboard" }
  }
}

export default async function HomePage() {
  const leaderboard = await getLeaderboard()

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">
        🏓 卓球大会プラットフォーム
      </h1>

      <section>
        <h2 className="text-xl mb-3">トッププレイヤー</h2>

        {leaderboard.error ? (
          <div className="text-red-400 text-sm">
            {leaderboard.error}
          </div>
        ) : leaderboard.users && leaderboard.users.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.users.slice(0, 5).map((u: any, i: number) => (
              <div key={u.id}>
                {i + 1}. {u.name} ({u.tier})
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-sm">
            アクティブなシーズンがありません
          </div>
        )}
      </section>
    </div>
  )
}