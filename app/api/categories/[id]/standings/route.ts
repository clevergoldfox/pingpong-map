import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
    _: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: categoryId } = await params

    const matches = await prisma.match.findMany({
        where: {
            categoryId,
            status: "FINISHED",
        },
    })

    const stats: Record<
        string,
        {
            wins: number
            losses: number
            opponents: string[]
        }
    > = {}

    for (const match of matches) {
        if (!match.player2Id) continue

        for (const player of [match.player1Id, match.player2Id]) {
            if (!stats[player]) {
                stats[player] = { wins: 0, losses: 0, opponents: [] }
            }
        }

        stats[match.player1Id].opponents.push(match.player2Id)
        stats[match.player2Id].opponents.push(match.player1Id)

        if (match.winnerId === match.player1Id) {
            stats[match.player1Id].wins++
            stats[match.player2Id].losses++
        } else if (match.winnerId === match.player2Id) {
            stats[match.player2Id].wins++
            stats[match.player1Id].losses++
        }
    }

    const standings = Object.entries(stats).map(([userId, record]) => {
        const buchholz = record.opponents.reduce(
            (sum, opp) => sum + (stats[opp]?.wins ?? 0),
            0
        )

        return {
            userId,
            wins: record.wins,
            losses: record.losses,
            points: record.wins * 3,
            buchholz,
        }
    })
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            return b.buchholz - a.buchholz
        })

    return NextResponse.json(standings)
}