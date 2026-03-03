import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { decideWinnerFromScores, normalizeScoreJson, stableStringify, type ScoreJson } from "@/lib/result"

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
          // decide winner deterministically from scores
          const winnerSide = decideWinnerFromScores(scores)
          const winnerId = winnerSide === "P1" ? match.player1Id : match.player2Id!

          // optimistic lock: update only if version unchanged
          const updated = await tx.match.updateMany({
            where: { id: matchId, version: match.version },
            data: {
              scoreJson: scores as any,
              winnerId,
              resultStatus: "LOCKED",
              status: "IN_PROGRESS", // keep IN_PROGRESS until organizer presses “種目終了” (your policy)
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