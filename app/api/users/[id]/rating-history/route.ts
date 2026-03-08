import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const history = await prisma.ratingHistory.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(history)
}