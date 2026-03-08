import RatingGraph from "@/components/RatingGraph"

async function getPlayer(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/players/${id}`,
    { cache: "no-store" }
  )
  return res.json()
}

async function getHistory(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/players/${id}/rating-history`,
    { cache: "no-store" }
  )
  return res.json()
}

export default async function PlayerPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const player = await getPlayer(id)
  const history = await getHistory(id)

  if (!player) return <div>プレイヤーが見つかりません</div>

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">{player.name}</h1>

      <div className="space-y-2">
        <div>生涯レーティング: {player.rating}</div>
        <div>シーズンレーティング: {player.seasonRating}</div>
        <div>ティア: {player.tier}</div>
        <div>試合数: {player.matchCount}</div>
        <div>勝ち: {player.wins}</div>
        <div>負け: {player.losses}</div>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">
        レーティング推移
      </h2>

      <RatingGraph data={history} />
    </div>
  )
}