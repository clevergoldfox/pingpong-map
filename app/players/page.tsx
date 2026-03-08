import Link from "next/link"

async function getPlayers(){
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/players`,
    {cache:"no-store"}
  )
  return res.json()
}

export default async function PlayersPage(){

  const players = await getPlayers()

  return(
    <div>

      <h1 className="text-3xl mb-6">プレイヤー一覧</h1>

      <div className="grid grid-cols-3 gap-4">

        {players.map((p:any)=>(
          <Link
            key={p.id}
            href={`/players/${p.id}`}
            className="border border-gray-700 p-4 rounded"
          >
            {p.name}
          </Link>
        ))}

      </div>

    </div>
  )
}