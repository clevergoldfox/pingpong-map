import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"
import { decideWinnerFromScores, normalizeScoreJson, stableStringify, type ScoreJson } from "@/lib/result"
import { calculateElo } from "@/lib/rating"
import { calculateTier } from "@/lib/tier"

type Body = {
    clientRequestId: string
    scores: ScoreJson
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params
    const body = (await req.json().catch(() => null)) as Body | null

    if (!body?.clientRequestId || !Array.isArray(body?.scores)) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    let scores: ScoreJson
    try {
        scores = normalizeScoreJson(body.scores)
    } catch (e: any) {
        return NextResponse.json({ error: e.message ?? "Invalid scores" }, { status: 400 })
    }

    const scoreKey = stableStringify(scores)

    try {
        const result = await prisma.$transaction(
            async (tx) => {
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

            // only authenticated players (and optionally organizer/admin) can submit for their own match
            const allowed = [match.player1Id, match.player2Id].filter(Boolean)
            if (!allowed.includes(user.id)) {
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
                where: { matchId, submittedById: user.id },
            })

            await tx.matchScoreSubmission.create({
                data: {
                    matchId,
                    submittedById: user.id,
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
                            // シーズンが無くても試合結果は確定する。レーティング更新のみスキップ
                        } else {
                        const user1 = await tx.user.findUnique({
                            where: { id: freshMatch.player1Id },
                            select: { id: true, rating: true, seasonRating: true },
                        })

                        const user2 = await tx.user.findUnique({
                            where: { id: freshMatch.player2Id! },
                            select: { id: true, rating: true, seasonRating: true },
                        })

                        if (user1 && user2) {
                            const p1Win = freshMatch.winnerId === user1.id ? 1 : 0
                            const p2Win = freshMatch.winnerId === user2.id ? 1 : 0

                            // Lifetime rating
                            const newLifetimeP1 = calculateElo(user1.rating, user2.rating, p1Win)
                            const newLifetimeP2 = calculateElo(user2.rating, user1.rating, p2Win)

                            // Seasonal rating
                            const newSeasonP1 = calculateElo(user1.seasonRating, user2.seasonRating, p1Win)
                            const newSeasonP2 = calculateElo(user2.seasonRating, user1.seasonRating, p2Win)

                            // calculate tiers
                            const newTierP1 = calculateTier(newSeasonP1)
                            const newTierP2 = calculateTier(newSeasonP2)

                            await tx.user.update({
                                where: { id: user1.id },
                                data: {
                                    rating: newLifetimeP1,
                                    seasonRating: newSeasonP1,
                                    tier: newTierP1,
                                },
                            })

                            await tx.user.update({
                                where: { id: user2.id },
                                data: {
                                    rating: newLifetimeP2,
                                    seasonRating: newSeasonP2,
                                    tier: newTierP2,
                                },
                            })

                            // Store rating history with seasonId
                            await tx.ratingHistory.create({
                                data: {
                                    userId: user1.id,
                                    matchId,
                                    seasonId: activeSeason.id,
                                    oldRating: user1.seasonRating,
                                    newRating: newSeasonP1,
                                    delta: newSeasonP1 - user1.seasonRating,
                                },
                            })

                            await tx.ratingHistory.create({
                                data: {
                                    userId: user2.id,
                                    matchId,
                                    seasonId: activeSeason.id,
                                    oldRating: user2.seasonRating,
                                    newRating: newSeasonP2,
                                    delta: newSeasonP2 - user2.seasonRating,
                                },
                            })

                            await tx.match.update({
                                where: { id: matchId },
                                data: { ratingApplied: true },
                            })
                        }
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
                        // Lock category only after ALL matches (all rounds, including finals) are finished
                        const allCategoryMatches = await tx.match.findMany({
                            where: { categoryId: match.categoryId },
                            select: { id: true, resultStatus: true },
                        })

                        const allLocked =
                            allCategoryMatches.length > 0 &&
                            allCategoryMatches.every((m) => m.resultStatus === "LOCKED")

                        if (allLocked) {
                            // Mark all matches in category as FINISHED
                            await tx.match.updateMany({
                                where: { categoryId: match.categoryId },
                                data: { status: "FINISHED" },
                            })

                            await tx.category.update({
                                where: { id: match.categoryId },
                                data: { isLocked: true },
                            })
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
        },
            {
                maxWait: 20_000,
                timeout: 30_000,
            }
        )

        return NextResponse.json(result.payload, { status: result.status })
    } catch (e: any) {
        const msg = e?.message ?? "Server error"
        const isTransactionTimeout =
            /transaction|timeout|given time/i.test(msg) || e?.code === "P2028"
        return NextResponse.json(
            { error: isTransactionTimeout ? "データベース接続が遅いためタイムアウトしました。しばらく待って再送信してください。" : msg },
            { status: isTransactionTimeout ? 503 : 500 }
        )
    }
}