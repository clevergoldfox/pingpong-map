import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed to finalize category" }, { status: 403 })
  }
  const { id: categoryId } = await params

  try {
    const result = await prisma.$transaction(async (tx) => {

      const category = await tx.category.findUnique({
        where: { id: categoryId },
      })

      if (!category) {
        return { ok: false, status: 404, payload: { error: "Category not found" } }
      }

      if (category.isLocked) {
        return { ok: false, status: 400, payload: { error: "Category already finalized" } }
      }

      const matches = await tx.match.findMany({
        where: { categoryId },
      })

      if (matches.length === 0) {
        return { ok: false, status: 400, payload: { error: "No matches found" } }
      }

      // Ensure all matches are LOCKED
      const incomplete = matches.some(
        m => m.resultStatus !== "LOCKED"
      )

      if (incomplete) {
        return {
          ok: false,
          status: 400,
          payload: { error: "Some matches are not locked yet" }
        }
      }

      // ---- Rating Calculation Placeholder ----
      // Here you will later compute rating changes
      // For MVP, skip or add simple +10/-10 logic

      // Mark all matches as FINISHED
      await tx.match.updateMany({
        where: { categoryId },
        data: { status: "FINISHED" },
      })

      // Lock category
      await tx.category.update({
        where: { id: categoryId },
        data: { isLocked: true },
      })

      return {
        ok: true,
        status: 200,
        payload: { message: "Category finalized successfully" }
      }
    })

    return NextResponse.json(result.payload, { status: result.status })

  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Server error" },
      { status: 500 }
    )
  }
}