import Link from "next/link"
import { CreateTournamentButton } from "@/components/CreateTournamentButton"

async function getTournaments() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    
    const res = await fetch(
      `${baseUrl}/api/tournaments`,
      { cache: "no-store" }
    )
    
    if (!res.ok) {
      return []
    }
    
    return await res.json()
  } catch (error) {
    console.error("Error loading tournaments:", error)
    return []
  }
}

export default async function TournamentsPage() {
  const tournaments = await getTournaments()

  return (
    <div>
      <h1 className="text-3xl mb-6">大会一覧</h1>

      <CreateTournamentButton />

      {tournaments.length === 0 ? (
        <div className="text-gray-400">大会がありません</div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t: any) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="block border p-4 rounded border-gray-700 hover:bg-gray-900"
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}