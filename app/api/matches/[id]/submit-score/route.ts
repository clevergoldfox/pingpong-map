import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { decideWinnerFromScores, normalizeScoreJson, stableStringify, type ScoreJson } from "@/lib/result"
import { calculateElo } from "@/lib/rating"

type Body = {
    userId: string
    clientRequestId: string
    scores: ScoreJson
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params
    const body = (await req.json().catch(() => null)) as Body | null

    if (!body?.userId || !body?.clientRequestId || !Array.isArray(body?.scores)) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    let scores: ScoreJson
    try {
        scores = normalizeScoreJson(body.scores)
    } catch (e: any) {
        return NextResponse.json({ error: e.message ?? "Invalid scores" }, { status: 400 })
    }

    const scoreKey = stableStringify(scores)

    try {
        const result = await prisma.$transaction(async (tx) => {
            const match = await tx.match.findUnique({
                where: { id: matchId },
                select: {
                    id: true,
                    categoryId: true,
                    player1Id: true,
                    player2Id: true,
                    status: true,
                    resultStatus: true,
                    version: true,
                },
            })
            if (!match) {
                return { ok: false as const, status: 404, payload: { error: "Match not found" } }
            }

            // Category lock check (if you added isLocked)
            const cat = await tx.category.findUnique({
                where: { id: match.categoryId },
                select: { isLocked: true },
            })
            if (cat?.isLocked) {
                return { ok: false as const, status: 400, payload: { error: "Category is locked. No edits allowed." } }
            }

            if (match.status === "FINISHED") {
                return { ok: false as const, status: 400, payload: { error: "Match already finished." } }
            }

            // MVP: only players (and optional referee later) can submit
            const allowed = [match.player1Id, match.player2Id].filter(Boolean)
            if (!allowed.includes(body.userId)) {
                return { ok: false as const, status: 403, payload: { error: "Not allowed to submit for this match." } }
            }

            // Idempotency: if same clientRequestId already exists -> return current match status
            const existingIdem = await tx.matchScoreSubmission.findUnique({
                where: { matchId_clientRequestId: { matchId, clientRequestId: body.clientRequestId } },
            })
            if (existingIdem) {
                const fresh = await tx.match.findUnique({
                    where: { id: matchId },
                    select: { status: true, resultStatus: true, winnerId: true, scoreJson: true },
                })
                return {
                    ok: true as const,
                    status: 200,
                    payload: { idempotent: true, match: fresh },
                }
            }

            // Replace previous submission by this user (MVP “latest only”)
            await tx.matchScoreSubmission.deleteMany({
                where: { matchId, submittedById: body.userId },
            })

            await tx.matchScoreSubmission.create({
                data: {
                    matchId,
                    submittedById: body.userId,
                    clientRequestId: body.clientRequestId,
                    scoreJson: scores as any,
                },
            })

            // Fetch submissions and check agreement
            const subs = await tx.matchScoreSubmission.findMany({
                where: { matchId },
                select: { submittedById: true, scoreJson: true },
            })

            // Need both players to submit same score
            const p1 = subs.find(s => s.submittedById === match.player1Id)
            const p2 = match.player2Id ? subs.find(s => s.submittedById === match.player2Id) : null

            // If BYE match (player2Id null), auto lock as FORFEIT? (your current rules may differ)
            if (!match.player2Id) {
                // MVP: do nothing here (handle BYE separately if needed)
                await tx.match.update({
                    where: { id: matchId },
                    data: { resultStatus: "IN_PROGRESS" },
                })
                return {
                    ok: true as const,
                    status: 200,
                    payload: { status: "IN_PROGRESS", reason: "BYE match. Manual handling required." },
                }
            }

            // if both submitted and same -> lock
            if (p1 && p2) {
                const k1 = stableStringify(p1.scoreJson)
                const k2 = stableStringify(p2.scoreJson)

                if (k1 === k2) {
                    const winnerSide = decideWinnerFromScores(scores)
                    const winnerId = winnerSide === "P1" ? match.player1Id : match.player2Id!

                    const updated = await tx.match.updateMany({
                        where: { id: matchId, version: match.version },
                        data: {
                            scoreJson: scores as any,
                            winnerId,
                            resultStatus: "LOCKED",
                            status: "IN_PROGRESS",
                            version: { increment: 1 },
                        },
                    })

                    if (updated.count !== 1) {
                        return {
                            ok: false as const,
                            status: 409,
                            payload: { error: "Conflict. Please retry." },
                        }
                    }

                    if (p1.id === p2.id) {
                        throw new Error("Invalid match: player cannot play against themselves.")
                    }

                    const MAX_MATCHES_BETWEEN_SAME_PLAYERS = 1

                    const previousMeetings = await tx.match.count({
                        where: {
                            tournamentId: match.tournamentId,
                            OR: [
                                {
                                    player1Id: p1.id,
                                    player2Id: p2.id,
                                },
                                {
                                    player1Id: p2.id,
                                    player2Id: p1.id,
                                },
                            ],
                            ratingApplied: true,
                        },
                    })

                    if (previousMeetings > MAX_MATCHES_BETWEEN_SAME_PLAYERS) {
                        throw new Error("Rating abuse detected: players exceeded allowed rematches.")
                    }

                    if (!match.player2Id) {
                        return
                    }

                    if (match.status === "FORFEIT") {
                        return
                    }

                    // 🔥 APPLY RATING SAFELY WITH SEASON SUPPORT

                    const freshMatch = await tx.match.findUnique({
                        where: { id: matchId },
                        select: {
                            player1Id: true,
                            player2Id: true,
                            winnerId: true,
                            ratingApplied: true,
                        },
                    })

                    if (freshMatch && !freshMatch.ratingApplied) {

                        const activeSeason = await tx.season.findFirst({
                            where: { isActive: true },
                        })

                        if (!activeSeason) {
                            throw new Error("No active season found.")
                        }

                        const p1 = await tx.user.findUnique({
                            where: { id: freshMatch.player1Id },
                            select: { id: true, rating: true, seasonRating: true },
                        })

                        const p2 = await tx.user.findUnique({
                            where: { id: freshMatch.player2Id! },
                            select: { id: true, rating: true, seasonRating: true },
                        })

                        if (p1 && p2) {
                            const p1Win = freshMatch.winnerId === p1.id ? 1 : 0
                            const p2Win = freshMatch.winnerId === p2.id ? 1 : 0

                            // Lifetime rating
                            const newLifetimeP1 = calculateElo(p1.rating, p2.rating, p1Win)
                            const newLifetimeP2 = calculateElo(p2.rating, p1.rating, p2Win)

                            // Seasonal rating
                            const newSeasonP1 = calculateElo(p1.seasonRating, p2.seasonRating, p1Win)
                            const newSeasonP2 = calculateElo(p2.seasonRating, p1.seasonRating, p2Win)

                            // Update users
                            await tx.user.update({
                                where: { id: p1.id },
                                data: {
                                    rating: newLifetimeP1,
                                    seasonRating: newSeasonP1,
                                },
                            })

                            await tx.user.update({
                                where: { id: p2.id },
                                data: {
                                    rating: newLifetimeP2,
                                    seasonRating: newSeasonP2,
                                },
                            })

                            // Store rating history with seasonId
                            await tx.ratingHistory.create({
                                data: {
                                    userId: p1.id,
                                    matchId,
                                    seasonId: activeSeason.id,
                                    oldRating: p1.seasonRating,
                                    newRating: newSeasonP1,
                                    delta: newSeasonP1 - p1.seasonRating,
                                },
                            })

                            await tx.ratingHistory.create({
                                data: {
                                    userId: p2.id,
                                    matchId,
                                    seasonId: activeSeason.id,
                                    oldRating: p2.seasonRating,
                                    newRating: newSeasonP2,
                                    delta: newSeasonP2 - p2.seasonRating,
                                },
                            })

                            await tx.match.update({
                                where: { id: matchId },
                                data: { ratingApplied: true },
                            })
                        }
                    }

                    // AUTO-COMPLETION CHECK

                    // Get category info
                    const category = await tx.category.findUnique({
                        where: { id: match.categoryId },
                        select: {
                            id: true,
                            currentRound: true,
                            roundCount: true,
                            isLocked: true,
                        },
                    })

                    if (category && !category.isLocked) {
                        // Get max round in this category
                        const maxRoundMatch = await tx.match.findFirst({
                            where: { categoryId: match.categoryId },
                            orderBy: { roundNumber: "desc" },
                            select: { roundNumber: true },
                        })

                        if (maxRoundMatch) {
                            const finalRound = maxRoundMatch.roundNumber

                            // Count matches in final round
                            const finalRoundMatches = await tx.match.findMany({
                                where: {
                                    categoryId: match.categoryId,
                                    roundNumber: finalRound,
                                },
                            })

                            const allLocked = finalRoundMatches.every(
                                m => m.resultStatus === "LOCKED"
                            )

                            if (allLocked) {
                                // Mark matches FINISHED
                                await tx.match.updateMany({
                                    where: {
                                        categoryId: match.categoryId,
                                        roundNumber: finalRound,
                                    },
                                    data: {
                                        status: "FINISHED",
                                    },
                                })

                                // Lock category
                                await tx.category.update({
                                    where: { id: match.categoryId },
                                    data: { isLocked: true },
                                })
                            }
                        }
                    }

                    return {
                        ok: true as const,
                        status: 200,
                        payload: { status: "LOCKED", winnerId },
                    }
                }
            }

            // Otherwise still in progress
            await tx.match.update({
                where: { id: matchId },
                data: { resultStatus: "IN_PROGRESS", version: { increment: 1 } },
            })

            return {
                ok: true as const,
                status: 200,
                payload: {
                    status: "IN_PROGRESS",
                    message: "Waiting for opponent confirmation / match agreement.",
                },
            }
        })

        return NextResponse.json(result.payload, { status: result.status })
    } catch (e: any) {
        return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 })
    }
}