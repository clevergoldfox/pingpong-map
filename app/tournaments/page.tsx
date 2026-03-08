import Link from "next/link"

async function getTournaments() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/tournaments`,
    { cache: "no-store" }
  )
  return res.json()
}

export default async function TournamentsPage() {

  const tournaments = await getTournaments()

  return (
    <div>
      <h1 className="text-3xl mb-6">大会一覧</h1>

      <div className="space-y-3">
        {tournaments.map((t:any)=>(
          <Link
            key={t.id}
            href={`/tournaments/${t.id}`}
            className="block border p-4 rounded border-gray-700 hover:bg-gray-900"
          >
            {t.name}
          </Link>
        ))}
      </div>

    </div>
  )
}