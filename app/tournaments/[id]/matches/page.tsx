import { getBaseUrl } from "@/lib/base-url"

async function getMatches(id:string){

  const res = await fetch( `${getBaseUrl()}/api/tournaments/${id}/matches`,{
    cache:"no-store"
  })

  return res.json()
}

export default async function MatchesPage(
  { params }:{params:Promise<{id:string}>}
){

  const {id} = await params

  const matches = await getMatches(id)

  return(

    <div>

      <h1 className="text-2xl mb-6">
        Matches
      </h1>

      {matches.map((m:any)=>(
        <div key={m.id} className="border p-3 mb-2">

          {m.player1Id} vs {m.player2Id}

          <div>
            Round {m.roundNumber}
          </div>

        </div>
      ))}

    </div>
  )
}