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

    </div>
  )
}