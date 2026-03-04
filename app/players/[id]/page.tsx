async function getPlayer(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/players/${id}`, {
    cache: "no-store",
  })
  return res.json()
}

export default async function PlayerPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const player = await getPlayer(id)

  if (!player) return <div>Player not found</div>

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">{player.name}</h1>

      <div className="space-y-2">
        <div>Lifetime Rating: {player.rating}</div>
        <div>Season Rating: {player.seasonRating}</div>
        <div>Tier: {player.tier}</div>
        <div>Matches Played: {player.matchCount}</div>
        <div>Wins: {player.wins}</div>
        <div>Losses: {player.losses}</div>
      </div>
    </div>
  )
}