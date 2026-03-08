async function getLeaderboard() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/leaderboard/season`,
    { cache: "no-store" }
  )
  return res.json()
}

export default async function HomePage() {

  const leaderboard = await getLeaderboard()

  return (
    <div className="space-y-8">

      <h1 className="text-4xl font-bold">
        🏓 Ping Pong Platform
      </h1>

      <section>
        <h2 className="text-xl mb-3">Top Players</h2>

        <div className="space-y-2">
          {leaderboard.users?.slice(0,5).map((u:any,i:number)=>(
            <div key={u.id}>
              {i+1}. {u.name} ({u.tier})
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}