import { getBaseUrl } from "@/lib/base-url"

async function getStandings(id:string){

  const res = await fetch( `${getBaseUrl()}/api/tournaments/${id}/standings`,{
    cache:"no-store"
  })

  return res.json()
}

export default async function StandingsPage(
  {params}:{params:Promise<{id:string}>}
){

  const {id} = await params

  const standings = await getStandings(id)

  return(

    <div>

      <h1 className="text-2xl mb-6">
        順位表
      </h1>

      <table className="border">

        <thead>
          <tr>
            <th>順位</th>
            <th>プレイヤー</th>
            <th>ポイント</th>
          </tr>
        </thead>

        <tbody>

        {standings.map((s:any,i:number)=>(
          <tr key={s.userId}>
            <td>{i+1}</td>
            <td>{s.user?.name ?? s.userId}</td>
            <td>{s.points}</td>
          </tr>
        ))}

        </tbody>

      </table>

    </div>
  )
}