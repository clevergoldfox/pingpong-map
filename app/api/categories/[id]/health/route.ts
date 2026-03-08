import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { calculateStandings } from "@/lib/standings"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params
  const totalRatingChanges = await prisma.ratingHistory.count()

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      tournament: {
        include: {
          participants: true,
        },
      },
      matches: true,
    },
  })

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  const matches = category.matches

  const totalMatches = matches.length
  const scheduled = matches.filter(m => m.status === "SCHEDULED").length
  const finished = matches.filter(m => m.status === "FINISHED").length
  const pendingResults = matches.filter(m => m.resultStatus === "PENDING").length
  const submittedResults = matches.filter(m => m.resultStatus === "SUBMITTED").length
  const lockedResults = matches.filter(m => m.resultStatus === "LOCKED").length

  const standings = calculateStandings(matches)

  const integrityIssues: string[] = []

  // Check: Finished match must have winner
  for (const m of matches) {
    if (m.status === "FINISHED" && !m.winnerId) {
      integrityIssues.push(`Match ${m.id} is FINISHED but has no winner.`)
    }
  }

  // Check: Locked result must be FINISHED
  for (const m of matches) {
    if (m.resultStatus === "LOCKED" && m.status !== "FINISHED") {
      integrityIssues.push(`Match ${m.id} is LOCKED but not FINISHED.`)
    }
  }

  // Check: Round overflow
  if (category.currentRound > category.roundCount) {
    integrityIssues.push("Current round exceeds roundCount.")
  }

  return NextResponse.json({
    categoryId,
    tournamentId: category.tournamentId,
    format: category.format,
    isLocked: category.isLocked,
    currentRound: category.currentRound,
    roundCount: category.roundCount,

    participants: category.tournament.participants.length,

    matchStats: {
      totalMatches,
      scheduled,
      finished,
      pendingResults,
      submittedResults,
      lockedResults,
    },

    standings,

    integrity: {
      healthy: integrityIssues.length === 0,
      issues: integrityIssues,
    },
  })
}