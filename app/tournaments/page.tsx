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

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
}

export default async function TournamentsPage() {
  const tournaments = await getTournaments()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">大会一覧</h1>
          <p className="text-sm text-gray-400">出たい大会をクリックしてください</p>
        </div>
        <CreateTournamentButton />
      </div>

      {tournaments.length === 0 ? (
        <div className="text-gray-400">現在、開催予定の大会はありません</div>
      ) : (
        <ul className="space-y-3">
          {tournaments.map((t: { id: string; name: string; location?: string; status?: string; startDate?: string }) => (
            <li key={t.id}>
              <Link
                href={`/tournaments/${t.id}`}
                className="block border border-gray-700 rounded-lg p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="font-semibold text-lg">{t.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {formatDate(t.startDate)}
                  {t.location && <span className="ml-2">／ {t.location}</span>}
                </div>
                {t.status && (
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                    {t.status === "REGISTRATION_OPEN" && "申込受付中"}
                    {t.status === "DRAFT" && "下書き"}
                    {t.status === "PUBLISHED" && "公開"}
                    {t.status === "CHECKIN" && "チェックイン中"}
                    {t.status === "STARTED" && "開催中"}
                    {t.status === "FINISHED" && "終了"}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}